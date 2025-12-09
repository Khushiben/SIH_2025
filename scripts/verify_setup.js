import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { ethers } from 'ethers';

dotenv.config();

console.log('🔍 Verifying Setup...\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Set' : '❌ Missing'}`);
console.log(`   PINATA_JWT: ${process.env.PINATA_JWT ? '✅ Set' : '❌ Missing'}`);
console.log(`   CONTRACT_ADDRESS: ${process.env.CONTRACT_ADDRESS ? '✅ Set' : '⚠️  Not set (optional)'}`);
console.log(`   HARDHAT_PRIVATE_KEY: ${process.env.HARDHAT_PRIVATE_KEY ? '✅ Set' : '⚠️  Not set (optional)'}`);
console.log(`   INFURA_URL: ${process.env.INFURA_URL ? '✅ Set' : '⚠️  Not set (optional)'}`);

// Check MongoDB connection
console.log('\n🗄️  MongoDB Connection:');
try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agriDirect');
  console.log('   ✅ MongoDB connection successful');
  await mongoose.disconnect();
} catch (error) {
  console.log(`   ❌ MongoDB connection failed: ${error.message}`);
}

// Check ethers.js
console.log('\n⛓️  Blockchain (ethers.js):');
try {
  const version = ethers.version || 'unknown';
  console.log(`   ✅ ethers.js loaded (version: ${version})`);
  
  if (process.env.CONTRACT_ADDRESS && process.env.INFURA_URL) {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.INFURA_URL);
      const blockNumber = await provider.getBlockNumber();
      console.log(`   ✅ Blockchain connection successful (block: ${blockNumber})`);
    } catch (error) {
      console.log(`   ⚠️  Blockchain connection failed: ${error.message}`);
      console.log('      (This is OK if Hardhat node is not running)');
    }
  } else {
    console.log('   ⚠️  Blockchain config incomplete (optional)');
  }
} catch (error) {
  console.log(`   ❌ ethers.js error: ${error.message}`);
}

// Check file system
import fs from 'fs';
import path from 'path';

console.log('\n📁 File System:');
const uploadsDir = path.join(process.cwd(), 'uploads');
const qrsDir = path.join(process.cwd(), 'uploads', 'qrs');

if (fs.existsSync(uploadsDir)) {
  console.log('   ✅ uploads/ directory exists');
} else {
  console.log('   ⚠️  uploads/ directory missing (will be created automatically)');
}

if (fs.existsSync(qrsDir)) {
  console.log('   ✅ uploads/qrs/ directory exists');
} else {
  console.log('   ⚠️  uploads/qrs/ directory missing (will be created automatically)');
}

// Check routes
console.log('\n🛣️  Routes:');
try {
  const wheatRouter = await import('../routes/wheat.js');
  console.log('   ✅ wheat.js route loaded');
} catch (error) {
  console.log(`   ❌ wheat.js route error: ${error.message}`);
}

console.log('\n✅ Setup verification complete!\n');
console.log('📝 Next steps:');
console.log('   1. Start MongoDB: mongod (or net start MongoDB on Windows)');
console.log('   2. Start Hardhat node: cd blockchain && npx hardhat node');
console.log('   3. Deploy contract: cd blockchain && npx hardhat run scripts/deployWheat.js --network localhost');
console.log('   4. Start server: npm start (or npm run dev)');
console.log('   5. Test: node scripts/lifecycle_sample.js\n');

process.exit(0);

