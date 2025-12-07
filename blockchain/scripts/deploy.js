const hre = require("hardhat");

async function main() {
  console.log("Deploying AgriEventStore contract...");
  
  // Get the contract factory
  const AgriEventStore = await hre.ethers.getContractFactory("AgriEventStore");
  
  // Deploy the contract
  const agriEventStore = await AgriEventStore.deploy();
  
  // Wait for the deployment to be mined
  await agriEventStore.deployed();
  
  console.log(`AgriEventStore deployed to: ${agriEventStore.address}`);
  
  // Verify the contract on Etherscan (if on a public testnet)
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for block confirmations...");
    await agriEventStore.deployTransaction.wait(6);
    
    console.log("Verifying contract on Etherscan...");
    await hre.run("verify:verify", {
      address: agriEventStore.address,
      constructorArguments: [],
    });
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
