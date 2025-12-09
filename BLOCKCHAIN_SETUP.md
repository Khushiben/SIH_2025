# Blockchain Setup Guide

## Quick Setup

### Option 1: Automated Setup (Recommended)

```bash
# This will check if Hardhat node is running, deploy contract, and update .env
npm run deploy:contract
```

### Option 2: Manual Setup

1. **Start Hardhat Node** (in a separate terminal):
   ```bash
   cd blockchain
   npx hardhat node
   ```
   Keep this terminal running. It provides the local blockchain.

2. **Deploy Contract** (in another terminal):
   ```bash
   cd blockchain
   npx hardhat run scripts/deployWheat.js --network localhost
   ```

3. **Update .env file**:
   Copy the contract address from the deployment output and add to `.env`:
   ```env
   CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
   INFURA_URL=http://127.0.0.1:8545
   HARDHAT_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```

4. **Restart Server**:
   ```bash
   npm start
   # or
   npm run dev
   ```

## Verification

After setup, you should see:
- ✅ Contract deployed message with address
- ✅ `.env` file updated with `CONTRACT_ADDRESS`
- ✅ No "CONTRACT_ADDRESS not set" warnings in server logs
- ✅ Transaction hashes in event responses

## Troubleshooting

### "CONTRACT_ADDRESS not set" warning
- Make sure you've deployed the contract and added the address to `.env`
- Restart the server after updating `.env`

### "Blockchain call failed" warning
- Make sure Hardhat node is running: `cd blockchain && npx hardhat node`
- Check that `INFURA_URL` in `.env` points to `http://127.0.0.1:8545`
- Verify the contract address is correct

### Contract deployment fails
- Ensure Hardhat node is running first
- Check that you're in the `blockchain` directory
- Verify Hardhat dependencies are installed: `cd blockchain && npm install`

## Testing

After setup, test with:
```bash
node scripts/lifecycle_sample.js
```

This will create a complete lifecycle and show transaction hashes if blockchain is working.

