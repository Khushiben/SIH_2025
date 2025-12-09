const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgriDirectWheatTracker", function () {
  let tracker;
  let owner;
  let farmer;
  let farmerAddr;
  let productIdHash;
  const testBatchId = "WHEAT-TEST-12345";

  beforeEach(async function () {
    [owner, farmer] = await ethers.getSigners();
    farmerAddr = await farmer.getAddress();

    const AgriDirectWheatTracker = await ethers.getContractFactory("AgriDirectWheatTracker");
    tracker = await AgriDirectWheatTracker.deploy();
    await tracker.waitForDeployment();

    // Register farmer as actor
    await tracker.registerActor(farmerAddr);

    // Compute productIdHash
    productIdHash = ethers.keccak256(ethers.toUtf8Bytes(testBatchId));
  });

  it("Should deploy successfully", async function () {
    expect(await tracker.getAddress()).to.be.properAddress;
    expect(await tracker.owner()).to.equal(await owner.getAddress());
  });

  it("Should register and unregister actors", async function () {
    const testAddr = ethers.Wallet.createRandom().address;
    await tracker.registerActor(testAddr);
    expect(await tracker.registeredActors(testAddr)).to.be.true;

    await tracker.unregisterActor(testAddr);
    expect(await tracker.registeredActors(testAddr)).to.be.false;
  });

  it("Should record SOWING event", async function () {
    const primaryCID = "QmTest123";
    const timestamp = Math.floor(Date.now() / 1000);

    const tx = await tracker.connect(farmer).registerSowing(
      productIdHash,
      primaryCID,
      timestamp,
      farmerAddr
    );

    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);

    const eventCount = await tracker.getEventCount(productIdHash);
    expect(eventCount).to.equal(1);
  });

  it("Should record TILLERING event", async function () {
    const primaryCID = "QmTillering123";
    const timestamp = Math.floor(Date.now() / 1000);

    const tx = await tracker.connect(farmer).recordTillering(
      productIdHash,
      primaryCID,
      timestamp,
      farmerAddr
    );

    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
  });

  it("Should record FLOWERING event", async function () {
    const primaryCID = "QmFlowering123";
    const timestamp = Math.floor(Date.now() / 1000);

    const tx = await tracker.connect(farmer).recordFlowering(
      productIdHash,
      primaryCID,
      timestamp,
      farmerAddr
    );

    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
  });

  it("Should record GRAIN_FILLING event", async function () {
    const primaryCID = "QmGrainFilling123";
    const timestamp = Math.floor(Date.now() / 1000);

    const tx = await tracker.connect(farmer).recordGrainFilling(
      productIdHash,
      primaryCID,
      timestamp,
      farmerAddr
    );

    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
  });

  it("Should record HARVEST event", async function () {
    const primaryCID = "QmHarvest123";
    const timestamp = Math.floor(Date.now() / 1000);

    const tx = await tracker.connect(farmer).recordHarvest(
      productIdHash,
      primaryCID,
      timestamp,
      farmerAddr
    );

    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
  });

  it("Should record CERTIFICATE_GENERATED event", async function () {
    const primaryCID = "QmCertificate123";
    const timestamp = Math.floor(Date.now() / 1000);

    const tx = await tracker.connect(farmer).certificateGenerated(
      productIdHash,
      primaryCID,
      timestamp,
      farmerAddr
    );

    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
  });

  it("Should record QR_GENERATED event", async function () {
    const primaryCID = "QmQR123";
    const timestamp = Math.floor(Date.now() / 1000);

    const tx = await tracker.connect(farmer).qrGenerated(
      productIdHash,
      primaryCID,
      timestamp,
      farmerAddr
    );

    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
  });

  it("Should record full lifecycle sequence", async function () {
    const events = [
      { name: "SOWING", cid: "QmSowing", func: "registerSowing" },
      { name: "TILLERING", cid: "QmTillering", func: "recordTillering" },
      { name: "FLOWERING", cid: "QmFlowering", func: "recordFlowering" },
      { name: "GRAIN_FILLING", cid: "QmGrainFilling", func: "recordGrainFilling" },
      { name: "HARVEST", cid: "QmHarvest", func: "recordHarvest" },
      { name: "CERTIFICATE_GENERATED", cid: "QmCertificate", func: "certificateGenerated" },
      { name: "QR_GENERATED", cid: "QmQR", func: "qrGenerated" }
    ];

    const timestamp = Math.floor(Date.now() / 1000);
    const txHashes = [];

    for (const event of events) {
      const tx = await tracker.connect(farmer)[event.func](
        productIdHash,
        event.cid,
        timestamp,
        farmerAddr
      );
      const receipt = await tx.wait();
      txHashes.push(receipt.hash);
      console.log(`✅ ${event.name} recorded - Tx: ${receipt.hash}`);
    }

    const eventCount = await tracker.getEventCount(productIdHash);
    expect(eventCount).to.equal(events.length);

    console.log("\n📋 Transaction Hashes:");
    txHashes.forEach((hash, idx) => {
      console.log(`${events[idx].name}: ${hash}`);
    });
  });

  it("Should reject unregistered actors", async function () {
    const unregistered = ethers.Wallet.createRandom();
    const primaryCID = "QmTest";
    const timestamp = Math.floor(Date.now() / 1000);

    await expect(
      tracker.connect(unregistered).recordEvent(
        productIdHash,
        "TEST_EVENT",
        primaryCID,
        timestamp,
        await unregistered.getAddress()
      )
    ).to.be.revertedWith("Not a registered actor");
  });
});

