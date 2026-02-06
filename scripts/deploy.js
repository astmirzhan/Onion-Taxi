const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // 1. Deploy Token (Treasury Mint 10M occurs in constructor)
    // Treasury = deployer address
    const ONTToken = await hre.ethers.getContractFactory("ONTToken");
    const ontToken = await ONTToken.deploy(deployer.address);
    await ontToken.waitForDeployment();
    const ontAddress = await ontToken.getAddress();
    console.log("ONTToken deployed to:", ontAddress);

    // 2. Deploy Factory
    // Rate = 100,000 ONT per ETH
    const rate = 100000;
    const CampaignFactory = await hre.ethers.getContractFactory("CampaignFactory");
    const factory = await CampaignFactory.deploy(ontAddress, rate);
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log("CampaignFactory deployed to:", factoryAddress);

    // 3. Setup Roles
    // Grant DEFAULT_ADMIN_ROLE to Factory so it can grant MINTER_ROLE to new Campaigns
    const DEFAULT_ADMIN_ROLE = await ontToken.DEFAULT_ADMIN_ROLE();
    await ontToken.grantRole(DEFAULT_ADMIN_ROLE, factoryAddress);
    console.log("Granted DEFAULT_ADMIN_ROLE to Factory");

    // Note: Deployer already has Admin & Minter role from constructor if needed, 
    // but Factory is the one managing minter roles for campaigns.

    // 4. Deploy DAO
    const OnionDAO = await hre.ethers.getContractFactory("OnionDAO");
    const minBalanceToVote = hre.ethers.parseUnits("100", 18);
    const minStakeToVote = hre.ethers.parseUnits("50", 18);
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
    console.log(`export const EXPECTED_CHAIN_ID = 31337;`);
    console.log("\n========================================");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
