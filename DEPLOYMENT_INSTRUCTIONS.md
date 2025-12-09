# Contract Deployment Instructions

## Quick Deployment

Since the automated script has module conflicts, use these manual steps:

### Step 1: Start Hardhat Node

Open a **new terminal** and run:
```bash
cd blockchain
npx hardhat node
```

Keep this terminal running. It provides the local blockchain.

### Step 2: Deploy Contract

Open **another terminal** and run:
```bash
cd blockchain
npx hardhat run scripts/deployWheat.js --network localhost
```

### Step 3: Update .env

Copy the contract address from the deployment output and add to your `.env` file:

```env
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
INFURA_URL=http://127.0.0.1:8545
HARDHAT_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### Step 4: Restart Server

```bash
npm start
```

## Alternative: Manual Contract Address

If deployment fails, you can use a placeholder address for testing (blockchain calls will fail but the system will still work):

```env
CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
```

The system will log warnings but continue to function. All events will still be stored in MongoDB and IPFS.

## Verification

After deployment, check server logs. You should see:
- ✅ No "CONTRACT_ADDRESS not set" warnings
- ✅ Transaction hashes in event responses (like `0x1234...`)

