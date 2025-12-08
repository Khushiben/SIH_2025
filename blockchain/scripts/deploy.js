const hre = require("hardhat");

async function main() {
  console.log("Deploying AgriEventStore contract...");
  
  // Get the contract factory
  const AgriEventStore = await hre.ethers.getContractFactory("AgriEventStore");
  
  // Deploy the contract
  const agriEventStore = await AgriEventStore.deploy();
  
  // Wait for the deployment to be mined (guard for different ethers/hardhat versions)
  try {
    if (typeof agriEventStore.deployed === 'function') {
      await agriEventStore.deployed();
    } else if (agriEventStore.deployTransaction && typeof agriEventStore.deployTransaction.wait === 'function') {
      await agriEventStore.deployTransaction.wait();
    }
  } catch (err) {
    console.warn('Warning: while waiting for deployment to be mined:', err.message || err);
  }
  
  console.log(`AgriEventStore deployed to: ${agriEventStore.address}`);
  
  // Verify the contract on Etherscan (if on a public testnet)
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for block confirmations...");
    try {
      if (agriEventStore.deployTransaction && typeof agriEventStore.deployTransaction.wait === 'function') {
        await agriEventStore.deployTransaction.wait(6);
      } else if (agriEventStore.deployTransaction && agriEventStore.deployTransaction.hash) {
        // fallback: request an evm_mine (best-effort for local networks)
        await hre.network.provider.request({ method: 'evm_mine' });
      } else {
        console.warn('No deployTransaction available to wait for confirmations.');
      }
    } catch (err) {
      console.warn('Warning: error waiting for confirmations:', err.message || err);
    }
    
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
