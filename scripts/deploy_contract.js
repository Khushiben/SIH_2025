import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

async function deployContract() {
  console.log('🚀 Starting Contract Deployment Process...\n');
  
  // Check if Hardhat node is running
  console.log('1️⃣ Checking if Hardhat node is running...');
  try {
    const { stdout } = await execAsync('curl -s -X POST -H "Content-Type: application/json" --data \'{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}\' http://127.0.0.1:8545');
    const response = JSON.parse(stdout);
    if (response.result) {
      console.log('   ✅ Hardhat node is running\n');
    } else {
      throw new Error('No response');
    }
  } catch (error) {
    console.log('   ❌ Hardhat node is NOT running!\n');
    console.log('   📝 Please start Hardhat node first:');
    console.log('      cd blockchain');
    console.log('      npx hardhat node\n');
    console.log('   Then run this script again.\n');
    process.exit(1);
  }
  
  // Deploy contract
  console.log('2️⃣ Deploying contract...');
  try {
    const { stdout, stderr } = await execAsync('cd blockchain && npx hardhat run scripts/deployWheat.js --network localhost');
    
    // Extract contract address from output
    const addressMatch = stdout.match(/AgriDirectWheatTracker deployed to: (0x[a-fA-F0-9]+)/);
    if (addressMatch) {
      const contractAddress = addressMatch[1];
      console.log(`   ✅ Contract deployed: ${contractAddress}\n`);
      
      // Update .env file
      console.log('3️⃣ Updating .env file...');
      const envPath = path.join(process.cwd(), '.env');
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
      envContent += `CONTRACT_ADDRESS=${contractAddress}\n`;
      
      // Ensure INFURA_URL is set
      if (!envContent.includes('INFURA_URL=')) {
        envContent += 'INFURA_URL=http://127.0.0.1:8545\n';
      }
      
      // Ensure HARDHAT_PRIVATE_KEY is set
      if (!envContent.includes('HARDHAT_PRIVATE_KEY=')) {
        envContent += 'HARDHAT_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80\n';
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log('   ✅ .env file updated\n');
      
      console.log('✅ Contract deployment complete!\n');
      console.log('📋 Contract Details:');
      console.log(`   Address: ${contractAddress}`);
      console.log(`   Network: Localhost (http://127.0.0.1:8545)`);
      console.log(`   RPC URL: http://127.0.0.1:8545\n`);
      console.log('🔄 Please restart your server to load the new contract address.\n');
      
    } else {
      console.log('   ⚠️  Could not extract contract address from output');
      console.log('   Please check the deployment output above and manually add CONTRACT_ADDRESS to .env\n');
    }
  } catch (error) {
    console.error('   ❌ Deployment failed:', error.message);
    if (error.stdout) console.log('   Output:', error.stdout);
    if (error.stderr) console.error('   Error:', error.stderr);
    process.exit(1);
  }
}

deployContract();

