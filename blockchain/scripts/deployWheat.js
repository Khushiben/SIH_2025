const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying AgriDirectWheatTracker contract...");

  const AgriDirectWheatTracker = await hre.ethers.getContractFactory("AgriDirectWheatTracker");
  const tracker = await AgriDirectWheatTracker.deploy();

  await tracker.waitForDeployment();

  const address = await tracker.getAddress();
  console.log("✅ AgriDirectWheatTracker deployed to:", address);
  console.log("\n📋 Updating .env file...");
  
  // Update .env file automatically
  try {
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Remove old CONTRACT_ADDRESS if exists
    envContent = envContent.replace(/CONTRACT_ADDRESS=.*\n/g, '');
    
    // Add new CONTRACT_ADDRESS
    if (!envContent.endsWith('\n') && envContent.length > 0) {
      envContent += '\n';
    }
    envContent += `CONTRACT_ADDRESS=${address}\n`;
    
    // Ensure INFURA_URL is set
    if (!envContent.includes('INFURA_URL=')) {
      envContent += 'INFURA_URL=http://127.0.0.1:8545\n';
    }
    
    // Ensure HARDHAT_PRIVATE_KEY is set
    if (!envContent.includes('HARDHAT_PRIVATE_KEY=')) {
      envContent += 'HARDHAT_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80\n';
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log("✅ .env file updated automatically!");
    console.log(`\n📋 Contract Address: ${address}`);
    console.log("🔄 Please restart your server to load the new contract address.\n");
  } catch (envError) {
    console.warn("⚠️ Could not update .env automatically:", envError.message);
    console.log("\n📋 Please manually add to your .env file:");
    console.log(`CONTRACT_ADDRESS=${address}`);
    console.log("INFURA_URL=http://127.0.0.1:8545");
    console.log("HARDHAT_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80\n");
  }
  
  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

