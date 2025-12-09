#!/bin/bash

echo "🚀 Setting up Blockchain for Wheat Lifecycle"
echo ""

# Check if Hardhat is installed
if [ ! -d "blockchain/node_modules" ]; then
    echo "📦 Installing Hardhat dependencies..."
    cd blockchain
    npm install
    cd ..
fi

echo "1️⃣ Starting Hardhat node in background..."
cd blockchain
npx hardhat node > ../hardhat_node.log 2>&1 &
HARDHAT_PID=$!
echo "   Hardhat node started (PID: $HARDHAT_PID)"
echo "   Logs: hardhat_node.log"
echo ""

# Wait for node to start
echo "⏳ Waiting for Hardhat node to start..."
sleep 5

echo "2️⃣ Deploying contract..."
npx hardhat run scripts/deployWheat.js --network localhost

echo ""
echo "✅ Setup complete!"
echo "📝 Don't forget to add CONTRACT_ADDRESS to your .env file"
echo "🛑 To stop Hardhat node: kill $HARDHAT_PID"

