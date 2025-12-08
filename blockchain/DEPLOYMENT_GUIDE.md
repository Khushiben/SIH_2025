# AgriEventStore Smart Contract Deployment Guide

## Overview
This guide will walk you through deploying the `AgriEventStore` smart contract to different networks using Hardhat.

## Prerequisites
- Node.js and npm installed
- Hardhat project setup (already done ✓)
- Required dependencies installed

## Step 1: Verify Dependencies
Make sure all dependencies are installed:

```bash
cd blockchain
npm install
```

## Step 2: Compile the Smart Contract

```bash
npx hardhat compile
```

This will compile the Solidity contract and generate the ABI and bytecode in `src/artifacts/`.

## Step 3: Deployment Options

### Option A: Local Network (Hardhat Node) - RECOMMENDED FOR TESTING

**Start a local Hardhat node in one terminal:**
```bash
npx hardhat node
```

This will start a local blockchain at `http://127.0.0.1:8545` with 20 pre-funded test accounts.

**Deploy in another terminal:**
```bash
npx hardhat run scripts/deploy.js --network localhost
```

**Expected Output:**
```
Deploying AgriEventStore contract...
AgriEventStore deployed to: 0x5FbDB2315678afccb333f8a9c812ab8abccbfe56
```

### Option B: Hardhat Built-in Network (Fastest)

```bash
npx hardhat run scripts/deploy.js
```

This deploys to the in-process Hardhat network and doesn't persist data after script execution.

## Step 4: Interact with Deployed Contract

After deployment, you can verify the contract was deployed by checking:

1. **Contract Address**: Save the address from deployment output (e.g., `0x5FbDB2315678afccb333f8a9c812ab8abccbfe56`)

2. **Test a function call** (create a test script):
```javascript
const hre = require("hardhat");

async function main() {
  const contractAddress = "0x5FbDB2315678afccb333f8a9c812ab8abccbfe56"; // Replace with your deployed address
  
  const AgriEventStore = await hre.ethers.getContractFactory("AgriEventStore");
  const contract = AgriEventStore.attach(contractAddress);
  
  // Get owner
  const owner = await contract.owner();
  console.log("Contract owner:", owner);
}

main().catch(console.error);
```

## Step 5: Deploy to Public Testnet (Optional)

### Sepolia Testnet Example

1. **Update `hardhat.config.js`:**
```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY], // Export private key as env variable
    },
  },
  paths: {
    artifacts: "./src/artifacts",
  },
};
```

2. **Set environment variables:**
```powershell
# In PowerShell
$env:INFURA_API_KEY = "your_infura_key"
$env:PRIVATE_KEY = "your_private_key"
```

3. **Deploy:**
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

## Contract Details

### AgriEventStore Functions

1. **recordEvent(uint256 productId, string memory eventName, string memory ipfsCID)**
   - Records a new event for a product
   - Stores event name, IPFS CID, timestamp, and caller address
   - Returns the event index

2. **getProductEvents(uint256 productId)**
   - Returns all events for a product

3. **getProductEventCount(uint256 productId)**
   - Returns the number of events for a product

4. **getProductEvent(uint256 productId, uint256 eventIndex)**
   - Returns a specific event by product ID and event index

## Verification Checklist

- [ ] Dependencies installed
- [ ] Contract compiled successfully
- [ ] Local node running (if using localhost)
- [ ] Deployment script executed
- [ ] Contract address obtained
- [ ] Functions callable via contract instance

## Troubleshooting

### Issue: "Cannot find module 'hardhat'"
**Solution:** Run `npm install` in the blockchain directory

### Issue: "Error: ethers is not defined"
**Solution:** Ensure hardhat-toolbox is installed: `npm install @nomicfoundation/hardhat-toolbox`

### Issue: Localhost connection refused
**Solution:** Make sure you're running `npx hardhat node` in another terminal before deploying to localhost

### Issue: Private key format error
**Solution:** Private key should be 64 hex characters (32 bytes) without '0x' prefix

## Next Steps

1. Deploy the contract using one of the options above
2. Save the contract address for integration with your Node.js backend
3. Update your backend services to interact with the contract address
