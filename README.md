# Onion Taxi Crowdfunding 🚕

A decentralized crowdfunding platform with ERC-20 reward tokens (`ONT`) and DAO governance.

## Architecture
- **Blockchain**: Ethereum (Hardhat Localhost / Sepolia)
- **Frontend**: React + Vite + Ethers.js
- **Contracts**:
  - `ONTToken`: ERC-20 Reward Token (Capped 50M, Partitioned Minting).
  - `CampaignFactory`: Spawns new crowdfunding campaigns.
  - `Campaign`: Individual fundraising logic (Escrow, Refund, 3% Fee).
  - `OnionDAO`: Governance staking and voting.

## 🚀 How to Run (Instructions)

### 1. Install Dependencies
```bash
# Root directory (Hardhat)
npm install

# Frontend directory
cd frontend
npm install
cd ..
```

### 2. Compile Contracts
```bash
npx hardhat compile
```

### 3. Run Validation Tests
This runs the automated test suite (`test/OnionTaxi.test.js`) verifying the entire flow.
```bash
npx hardhat test
```

### 4. Start Local Blockchain
Open a new terminal:
```bash
npx hardhat node
```

### 5. Deploy Contracts
Open another terminal:
```bash
npx hardhat run scripts/deploy.js --network localhost
```
*Note: After deployment, copy the addresses printed in the console to `frontend/src/config.js` if they changed.*

### 6. Run Frontend
```bash
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🦊 MetaMask Setup (Localhost)
1. Add Network:
   - **RPC URL**: `http://127.0.0.1:8545/`
   - **Chain ID**: `31337`
   - **Currency**: `ETH`
2. Import Account:
   - Copy a private key from the `npx hardhat node` terminal output (e.g., Account #0 or #1).
   - Import into MetaMask.

## ✨ Features
- **Partial Minting**: Users get ONT tokens automatically when donating.
- **Platform Fee**: The platform owner (you) gets 3% of all successful funds.
- **Refunds**: If a goal is not met, donors get 100% ETH back.
- **DAO**: Stake ONT tokens to vote on proposals.
