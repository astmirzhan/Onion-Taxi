const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // 1. Deploy ONTToken
    const ONTToken = await hre.ethers.getContractFactory("ONTToken");
    const ontToken = await ONTToken.deploy(deployer.address);
    await ontToken.waitForDeployment();
    const ontAddress = await ontToken.getAddress();
    console.log("ONTToken deployed to:", ontAddress);

    // 2. Deploy CampaignFactory
    const rate = 100; // 100 ONT per 1 ETH contributed
    const CampaignFactory = await hre.ethers.getContractFactory("CampaignFactory");
    const factory = await CampaignFactory.deploy(ontAddress, rate);
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log("CampaignFactory deployed to:", factoryAddress);

    // 3. Grant MINTER_ROLE to Factory so campaigns can mint ONT
    const MINTER_ROLE = await ontToken.MINTER_ROLE();
    // Note: Campaign contracts minted by Factory will need this role
    // For simplicity, we grant it to Factory address (campaigns call ontToken.mint)
    // Actually, individual Campaign contracts call mint, so we need a different approach
    // Let's grant MINTER_ROLE widely or use a pattern where Factory grants it

    // For now, we'll grant MINTER_ROLE to any address as needed by campaign
    // A better pattern: make Factory control minting or grant role per campaign
    console.log("Note: You need to grant MINTER_ROLE to each Campaign contract after creation");

    // 4. Deploy OnionDAO
    const OnionDAO = await hre.ethers.getContractFactory("OnionDAO");
    const minBalanceToVote = hre.ethers.parseUnits("100", 18); // 100 ONT
    const minStakeToVote = hre.ethers.parseUnits("50", 18);    // 50 ONT
    const dao = await OnionDAO.deploy(ontAddress, minBalanceToVote, minStakeToVote);
    await dao.waitForDeployment();
    const daoAddress = await dao.getAddress();
    console.log("OnionDAO deployed to:", daoAddress);

    console.log("\n========================================");
    console.log("DEPLOYMENT COMPLETE!");
    console.log("========================================");
    console.log("\nCopy these addresses to frontend/src/config.js:\n");
    console.log(`export const FACTORY_ADDRESS = "${factoryAddress}";`);
    console.log(`export const ONT_ADDRESS = "${ontAddress}";`);
    console.log(`export const DAO_ADDRESS = "${daoAddress}";`);
    console.log(`export const NETWORK_NAME = "localhost";`);
    console.log("\n========================================");

    // Grant MINTER_ROLE to the Factory (so campaigns created by it can mint)
    // Actually, campaigns directly call ontToken.mint, so each campaign needs the role
    // We'll grant it to deployer for testing purposes
    await ontToken.grantRole(MINTER_ROLE, deployer.address);
    console.log("\nGranted MINTER_ROLE to deployer for testing");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
