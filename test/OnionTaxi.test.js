const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Onion Taxi Crowdfunding System", function () {
    let ONTToken, CampaignFactory, Campaign;
    let ontToken, factory, campaign;
    let owner, creator, user1, user2, feeRecipient;
    let campaignAddress;

    const RATE = 100000; // 1 ETH = 100,000 ONT
    const GOAL_ETH = ethers.parseEther("10"); // 10 ETH Goal
    const DURATION = 3600; // 1 hour
    const ONION_DECIMITALS = 18;

    beforeEach(async function () {
        [owner, creator, user1, user2, feeRecipient] = await ethers.getSigners();

        // 1. Deploy Token
        ONTToken = await ethers.getContractFactory("ONTToken");
        // Owner is treasury in this test context
        ontToken = await ONTToken.deploy(owner.address);
        await ontToken.waitForDeployment();

        // 2. Deploy Factory
        CampaignFactory = await ethers.getContractFactory("CampaignFactory");
        factory = await CampaignFactory.deploy(await ontToken.getAddress(), RATE);
        await factory.waitForDeployment();

        // 3. Setup Roles
        const DEFAULT_ADMIN_ROLE = await ontToken.DEFAULT_ADMIN_ROLE();
        await ontToken.grantRole(DEFAULT_ADMIN_ROLE, await factory.getAddress());
    });

    describe("Deployment & Setup", function () {
        it("Should mint 20% of Cap to Treasury (Owner)", async function () {
            const maxSupply = ethers.parseUnits("30000000", 18);
            const expectedTreasury = (maxSupply * 20n) / 100n; // 6M
            expect(await ontToken.balanceOf(owner.address)).to.equal(expectedTreasury);
        });

        it("Factory should have ADMIN role to grant MINTER role", async function () {
            const DEFAULT_ADMIN_ROLE = await ontToken.DEFAULT_ADMIN_ROLE();
            expect(await ontToken.hasRole(DEFAULT_ADMIN_ROLE, await factory.getAddress())).to.be.true;
        });
    });

    describe("Campaign Flow", function () {
        beforeEach(async function () {
            // Create Campaign
            const tx = await factory.connect(creator).createCampaign(
                "Test Campaign",
                GOAL_ETH,
                DURATION
            );
            const receipt = await tx.wait();
            // Find event
            const event = receipt.logs.find(log => {
                try { return factory.interface.parseLog(log).name === 'CampaignCreated'; } catch (e) { return false }
            });
            campaignAddress = factory.interface.parseLog(event).args.campaign;
            Campaign = await ethers.getContractFactory("Campaign");
            campaign = Campaign.attach(campaignAddress);
        });

        it("Should have correct initial data", async function () {
            const summary = await campaign.getSummary();
            expect(summary._title).to.equal("Test Campaign");
            expect(summary._goalWei).to.equal(GOAL_ETH);
            expect(summary._creator).to.equal(creator.address);
        });

        it("Should accept donations and mint tokens (User 1)", async function () {
            const donateAmount = ethers.parseEther("1"); // 1 ETH

            // User 1 donates
            await expect(campaign.connect(user1).contribute({ value: donateAmount }))
                .to.emit(campaign, "Contributed")
                .withArgs(user1.address, donateAmount)
                .and.to.emit(campaign, "RewardMinted");

            // Check Campaign Balance
            expect(await ethers.provider.getBalance(campaignAddress)).to.equal(donateAmount);

            // Check User Contribution Mapping
            expect(await campaign.contributions(user1.address)).to.equal(donateAmount);

            // Check Token Reward: 1 ETH * 100,000 = 100,000 ONT
            const expectedTokens = ethers.parseUnits("100000", 18);
            expect(await ontToken.balanceOf(user1.address)).to.equal(expectedTokens);
        });

        it("Should track multiple contributors correctly", async function () {
            // User 1: 2 ETH
            await campaign.connect(user1).contribute({ value: ethers.parseEther("2") });
            // User 2: 5 ETH
            await campaign.connect(user2).contribute({ value: ethers.parseEther("5") });

            expect(await campaign.contributions(user1.address)).to.equal(ethers.parseEther("2"));
            expect(await campaign.contributions(user2.address)).to.equal(ethers.parseEther("5"));
            expect(await campaign.totalRaised()).to.equal(ethers.parseEther("7"));
        });

        it("Should handle Goal Reached & Withdrawal with Fee", async function () {
            // 1. Contributors hit the goal (10 ETH)
            await campaign.connect(user1).contribute({ value: ethers.parseEther("5") });
            await campaign.connect(user2).contribute({ value: ethers.parseEther("5") });

            // 2. Fast forward time past deadline
            await time.increase(DURATION + 1);

            // 3. Creator Withdraws
            // Expect 3% fee to go to FeeRecipient (which is Factory deployer = owner in this test setup, 
            // strictly speaking factory sets feeRecipient to msg.sender of factory deploy -> owner)

            // Capture balances before
            const feeRecipientAddr = await campaign.feeRecipient(); // Should be owner
            const balanceBeforeCreator = await ethers.provider.getBalance(creator.address);
            const balanceBeforeFee = await ethers.provider.getBalance(feeRecipientAddr);

            const tx = await campaign.connect(creator).withdrawCreator();
            const receipt = await tx.wait();

            // Calculate Gas (approx) to check creator balance accurately? 
            // Or just check the transfer amounts from events or storage diffs.
            // Let's check the FeePaid event
            const feeAmount = (ethers.parseEther("10") * 3n) / 100n; // 0.3 ETH
            const creatorAmount = ethers.parseEther("10") - feeAmount; // 9.7 ETH

            await expect(tx)
                .to.emit(campaign, "FeePaid").withArgs(feeRecipientAddr, feeAmount)
                .and.to.emit(campaign, "CreatorWithdrawn").withArgs(creator.address, creatorAmount);

            // Verify contract is empty
            expect(await ethers.provider.getBalance(campaignAddress)).to.equal(0);
        });

        it("Should allow Refunds if Goal NOT Met", async function () {
            // 1. Contribute less than goal (5 ETH / 10 ETH)
            await campaign.connect(user1).contribute({ value: ethers.parseEther("5") });

            // 2. Fast forward
            await time.increase(DURATION + 1);

            // 3. User refunds
            const balanceBefore = await ethers.provider.getBalance(user1.address);

            const tx = await campaign.connect(user1).refund();
            const receipt = await tx.wait();

            // Calculate Gas used
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const balanceAfter = await ethers.provider.getBalance(user1.address);

            // Balance should increase by 5 ETH minus gas
            expect(balanceAfter + gasUsed - balanceBefore).to.equal(ethers.parseEther("5"));
        });
    });
});
