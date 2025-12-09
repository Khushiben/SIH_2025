import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { ethers } from 'ethers';
import EventLedger from '../models/EventLedger.js';
import Product from '../models/Product.js';
import Farmer from '../models/Farmer.js';
import { handleFileUpload, uploadJSONToPinata } from '../services/pinataUpload.js';
import dotenv from 'dotenv';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

dotenv.config();

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

// Helper function to validate file types
const validateFile = (file, allowedTypes, maxSize) => {
  if (!file) return { valid: true };
  
  const fileType = file.mimetype;
  const fileSize = file.size;
  
  if (!allowedTypes.includes(fileType)) {
    return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` };
  }
  
  if (fileSize > maxSize) {
    return { valid: false, error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit` };
  }
  
  return { valid: true };
};

// Helper function to get latest event hash for a batchId
async function getLatestEventHash(batchId) {
  const latestEvent = await EventLedger.findOne(
    { productId: batchId },
    {},
    { sort: { timestamp: -1 } }
  ).lean();
  
  return latestEvent ? latestEvent.currentHash : null;
}

// Helper function to compute deterministic hash
function computeHash(data) {
  // Sort keys for deterministic JSON
  const sorted = {};
  Object.keys(data).sort().forEach(key => {
    sorted[key] = data[key];
  });
  
  const dataString = JSON.stringify(sorted);
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

// Helper function to call smart contract
async function callSmartContract(eventName, batchId, primaryCID, timestamp, actorAddress) {
  try {
    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress) {
      console.warn('⚠️ CONTRACT_ADDRESS not set, skipping blockchain call');
      return null;
    }
    
    // Check if INFURA_URL is set, if not skip blockchain call
    const rpcUrl = process.env.INFURA_URL || 'http://127.0.0.1:8545';
    
    try {
      // ethers v6 syntax
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(process.env.HARDHAT_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
      
      // Load contract ABI (simplified - in production, load from artifacts)
      const contractABI = [
        "function recordEvent(bytes32 productIdHash, string calldata eventName, string calldata primaryCID, uint256 timestamp, address actor) external returns (bytes32)"
      ];
      
      const contract = new ethers.Contract(contractAddress, contractABI, wallet);
      
      // Compute productIdHash - ethers v6
      const productIdHash = ethers.keccak256(ethers.toUtf8Bytes(batchId));
      
      // Call contract
      const tx = await contract.recordEvent(
        productIdHash,
        eventName,
        primaryCID,
        Math.floor(timestamp / 1000), // Convert to seconds
        actorAddress
      );
      
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (blockchainError) {
      // If blockchain is not available, log warning but don't fail
      console.warn('⚠️ Blockchain call failed (this is OK if Hardhat node is not running):', blockchainError.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Smart contract call error:', error.message);
    return null;
  }
}

// Helper function to create event ledger entry
async function createEventLedgerEntry({
  batchId,
  eventName,
  eventData,
  ipfsCids,
  timestamp,
  role,
  txHash
}) {
  const prevHash = await getLatestEventHash(batchId);
  
  // Build hash data
  const hashData = {
    productId: batchId,
    eventName,
    eventData,
    timestamp: timestamp.toISOString(),
    ipfsCids,
    prevHash
  };
  
  const currentHash = computeHash(hashData);
  
  // Create event ledger entry
  const eventEntry = new EventLedger({
    productId: batchId,
    eventName,
    eventData,
    timestamp,
    role,
    ipfsCids,
    prevHash,
    currentHash,
    txHash
  });
  
  await eventEntry.save();
  return eventEntry;
}

// Helper function to update QR code with latest certificate
async function updateProductQR(batchId) {
  try {
    const product = await Product.findOne({ batchId });
    if (!product || !product.certificateCID) {
      return null; // No product or certificate yet
    }
    
    const qrDir = path.join(process.cwd(), 'uploads', 'qrs');
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }
    
    const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
    const qrUrl = `${serverUrl}/wheat/certificate/${product.certificateCID}`;
    const qrFileName = `${product._id || batchId}-certificateQR.png`;
    const qrFullPath = path.join(qrDir, qrFileName);
    
    await QRCode.toFile(qrFullPath, qrUrl);
    const qrPath = `/uploads/qrs/${qrFileName}`;
    
    // Update product with new QR path
    await Product.updateOne({ batchId }, { qrPath });
    
    return qrPath;
  } catch (error) {
    console.warn('⚠️ QR update failed:', error.message);
    return null;
  }
}

// EVENT 1: Sowing & Land Preparation
router.post('/event/sowing', upload.fields([
  { name: 'soilReportFile', maxCount: 1 },
  { name: 'imageFieldBeforeSowing', maxCount: 1 },
  { name: 'imageSeedsUsed', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      farmerId,
      batchId,
      gpsLocation,
      sowingDate,
      seedType,
      seedVariety,
      seedSource,
      soilType,
      firstIrrigationDone,
      remarks
    } = req.body;
    
    if (!farmerId || !batchId) {
      return res.status(400).json({ success: false, message: 'farmerId and batchId are required' });
    }
    
    // Validate files
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const pdfTypes = ['application/pdf'];
    
    if (req.files['soilReportFile']) {
      const validation = validateFile(req.files['soilReportFile'][0], pdfTypes, 10 * 1024 * 1024);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.error });
      }
    }
    
    if (req.files['imageFieldBeforeSowing']) {
      const validation = validateFile(req.files['imageFieldBeforeSowing'][0], imageTypes, 5 * 1024 * 1024);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.error });
      }
    }
    
    if (req.files['imageSeedsUsed']) {
      const validation = validateFile(req.files['imageSeedsUsed'][0], imageTypes, 5 * 1024 * 1024);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.error });
      }
    }
    
    // Upload files to Pinata
    const ipfsCids = [];
    const fileMetadata = {};
    
    if (req.files['soilReportFile']) {
      const result = await handleFileUpload(req.files['soilReportFile'][0]);
      if (result.success && result.ipfsHash) {
        ipfsCids.push(result.ipfsHash);
        fileMetadata.soilReportFile = { cid: result.ipfsHash, filename: req.files['soilReportFile'][0].originalname };
      }
    }
    
    if (req.files['imageFieldBeforeSowing']) {
      const result = await handleFileUpload(req.files['imageFieldBeforeSowing'][0]);
      if (result.success && result.ipfsHash) {
        ipfsCids.push(result.ipfsHash);
        fileMetadata.imageFieldBeforeSowing = { cid: result.ipfsHash, filename: req.files['imageFieldBeforeSowing'][0].originalname };
      }
    }
    
    if (req.files['imageSeedsUsed']) {
      const result = await handleFileUpload(req.files['imageSeedsUsed'][0]);
      if (result.success && result.ipfsHash) {
        ipfsCids.push(result.ipfsHash);
        fileMetadata.imageSeedsUsed = { cid: result.ipfsHash, filename: req.files['imageSeedsUsed'][0].originalname };
      }
    }
    
    const primaryCID = ipfsCids[0] || '';
    const timestamp = new Date();
    
    // Build event data
    const eventData = {
      farmerId,
      batchId,
      gpsLocation,
      sowingDate,
      seedType,
      seedVariety,
      seedSource,
      soilType,
      firstIrrigationDone,
      remarks,
      fileMetadata
    };
    
    // Get farmer wallet address
    const farmer = await Farmer.findById(farmerId);
    const actorAddress = farmer?.walletAddress || process.env.DEFAULT_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';
    
    // Call smart contract
    const txHash = await callSmartContract('SOWING', batchId, primaryCID, timestamp.getTime(), actorAddress);
    
    // Create event ledger entry
    const eventEntry = await createEventLedgerEntry({
      batchId,
      eventName: 'SOWING',
      eventData,
      ipfsCids,
      timestamp,
      role: 'farmer',
      txHash
    });
    
    res.json({
      success: true,
      message: 'Sowing event recorded successfully',
      block: {
        eventName: eventEntry.eventName,
        currentHash: eventEntry.currentHash,
        txHash: eventEntry.txHash,
        timestamp: eventEntry.timestamp
      }
    });
  } catch (error) {
    console.error('❌ Sowing event error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// EVENT 2: Tillering
router.post('/event/tillering', upload.fields([
  { name: 'imageFieldGrowth', maxCount: 1 },
  { name: 'imageFertilizerUsed', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      batchId,
      date,
      tillerCount,
      irrigationGiven,
      waterAppliedLitres,
      fertilizerUsed,
      fertilizerType,
      fertilizerQuantity,
      remarks
    } = req.body;
    
    if (!batchId) {
      return res.status(400).json({ success: false, message: 'batchId is required' });
    }
    
    // Validate and upload files
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const ipfsCids = [];
    const fileMetadata = {};
    
    if (req.files['imageFieldGrowth']) {
      const validation = validateFile(req.files['imageFieldGrowth'][0], imageTypes, 5 * 1024 * 1024);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.error });
      }
      const result = await handleFileUpload(req.files['imageFieldGrowth'][0]);
      if (result.success && result.ipfsHash) {
        ipfsCids.push(result.ipfsHash);
        fileMetadata.imageFieldGrowth = { cid: result.ipfsHash, filename: req.files['imageFieldGrowth'][0].originalname };
      }
    }
    
    if (req.files['imageFertilizerUsed']) {
      const validation = validateFile(req.files['imageFertilizerUsed'][0], imageTypes, 5 * 1024 * 1024);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.error });
      }
      const result = await handleFileUpload(req.files['imageFertilizerUsed'][0]);
      if (result.success && result.ipfsHash) {
        ipfsCids.push(result.ipfsHash);
        fileMetadata.imageFertilizerUsed = { cid: result.ipfsHash, filename: req.files['imageFertilizerUsed'][0].originalname };
      }
    }
    
    const primaryCID = ipfsCids[0] || '';
    const timestamp = new Date();
    
    const eventData = {
      batchId,
      date,
      tillerCount,
      irrigationGiven,
      waterAppliedLitres,
      fertilizerUsed,
      fertilizerType,
      fertilizerQuantity,
      remarks,
      fileMetadata
    };
    
    // Get farmer from batchId (need to find product or event)
    const latestEvent = await EventLedger.findOne({ productId: batchId, eventName: 'SOWING' }).sort({ timestamp: -1 });
    const farmerId = latestEvent?.eventData?.farmerId;
    const farmer = farmerId ? await Farmer.findById(farmerId) : null;
    const actorAddress = farmer?.walletAddress || process.env.DEFAULT_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';
    
    const txHash = await callSmartContract('TILLERING', batchId, primaryCID, timestamp.getTime(), actorAddress);
    
    const eventEntry = await createEventLedgerEntry({
      batchId,
      eventName: 'TILLERING',
      eventData,
      ipfsCids,
      timestamp,
      role: 'farmer',
      txHash
    });
    
    res.json({
      success: true,
      message: 'Tillering event recorded successfully',
      block: {
        eventName: eventEntry.eventName,
        currentHash: eventEntry.currentHash,
        txHash: eventEntry.txHash,
        timestamp: eventEntry.timestamp
      }
    });
  } catch (error) {
    console.error('❌ Tillering event error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// EVENT 3: Flowering/Booting
router.post('/event/flowering', upload.fields([
  { name: 'imagePestAttack', maxCount: 1 },
  { name: 'imageAfterSpray', maxCount: 1 },
  { name: 'pesticideBillFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      batchId,
      date,
      pestAttack,
      pestType,
      pestSeverity,
      pesticideUsed,
      pesticideType,
      pesticideQuantity,
      irrigationGiven,
      remarks
    } = req.body;
    
    if (!batchId) {
      return res.status(400).json({ success: false, message: 'batchId is required' });
    }
    
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const pdfTypes = ['application/pdf'];
    const ipfsCids = [];
    const fileMetadata = {};
    
    if (req.files['imagePestAttack']) {
      const validation = validateFile(req.files['imagePestAttack'][0], imageTypes, 5 * 1024 * 1024);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.error });
      }
      const result = await handleFileUpload(req.files['imagePestAttack'][0]);
      if (result.success && result.ipfsHash) {
        ipfsCids.push(result.ipfsHash);
        fileMetadata.imagePestAttack = { cid: result.ipfsHash, filename: req.files['imagePestAttack'][0].originalname };
      }
    }
    
    if (req.files['imageAfterSpray']) {
      const validation = validateFile(req.files['imageAfterSpray'][0], imageTypes, 5 * 1024 * 1024);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.error });
      }
      const result = await handleFileUpload(req.files['imageAfterSpray'][0]);
      if (result.success && result.ipfsHash) {
        ipfsCids.push(result.ipfsHash);
        fileMetadata.imageAfterSpray = { cid: result.ipfsHash, filename: req.files['imageAfterSpray'][0].originalname };
      }
    }
    
    if (req.files['pesticideBillFile']) {
      const validation = validateFile(req.files['pesticideBillFile'][0], pdfTypes, 10 * 1024 * 1024);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.error });
      }
      const result = await handleFileUpload(req.files['pesticideBillFile'][0]);
      if (result.success && result.ipfsHash) {
        ipfsCids.push(result.ipfsHash);
        fileMetadata.pesticideBillFile = { cid: result.ipfsHash, filename: req.files['pesticideBillFile'][0].originalname };
      }
    }
    
    const primaryCID = ipfsCids[0] || '';
    const timestamp = new Date();
    
    const eventData = {
      batchId,
      date,
      pestAttack,
      pestType,
      pestSeverity,
      pesticideUsed,
      pesticideType,
      pesticideQuantity,
      irrigationGiven,
      remarks,
      fileMetadata
    };
    
    const latestEvent = await EventLedger.findOne({ productId: batchId }).sort({ timestamp: -1 });
    const farmerId = latestEvent?.eventData?.farmerId;
    const farmer = farmerId ? await Farmer.findById(farmerId) : null;
    const actorAddress = farmer?.walletAddress || process.env.DEFAULT_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';
    
    const txHash = await callSmartContract('FLOWERING', batchId, primaryCID, timestamp.getTime(), actorAddress);
    
    const eventEntry = await createEventLedgerEntry({
      batchId,
      eventName: 'FLOWERING',
      eventData,
      ipfsCids,
      timestamp,
      role: 'farmer',
      txHash
    });
    
    res.json({
      success: true,
      message: 'Flowering event recorded successfully',
      block: {
        eventName: eventEntry.eventName,
        currentHash: eventEntry.currentHash,
        txHash: eventEntry.txHash,
        timestamp: eventEntry.timestamp
      }
    });
  } catch (error) {
    console.error('❌ Flowering event error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// EVENT 4: Grain Filling/Ripening
router.post('/event/grainfilling', upload.fields([
  { name: 'imageRipeningWheat', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      batchId,
      date,
      cropColor,
      moistureLevelPercent,
      lastIrrigationGiven,
      weatherCondition,
      lodging,
      remarks
    } = req.body;
    
    if (!batchId) {
      return res.status(400).json({ success: false, message: 'batchId is required' });
    }
    
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const ipfsCids = [];
    const fileMetadata = {};
    
    if (req.files['imageRipeningWheat']) {
      const validation = validateFile(req.files['imageRipeningWheat'][0], imageTypes, 5 * 1024 * 1024);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.error });
      }
      const result = await handleFileUpload(req.files['imageRipeningWheat'][0]);
      if (result.success && result.ipfsHash) {
        ipfsCids.push(result.ipfsHash);
        fileMetadata.imageRipeningWheat = { cid: result.ipfsHash, filename: req.files['imageRipeningWheat'][0].originalname };
      }
    }
    
    const primaryCID = ipfsCids[0] || '';
    const timestamp = new Date();
    
    const eventData = {
      batchId,
      date,
      cropColor,
      moistureLevelPercent,
      lastIrrigationGiven,
      weatherCondition,
      lodging,
      remarks,
      fileMetadata
    };
    
    const latestEvent = await EventLedger.findOne({ productId: batchId }).sort({ timestamp: -1 });
    const farmerId = latestEvent?.eventData?.farmerId;
    const farmer = farmerId ? await Farmer.findById(farmerId) : null;
    const actorAddress = farmer?.walletAddress || process.env.DEFAULT_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';
    
    const txHash = await callSmartContract('GRAIN_FILLING', batchId, primaryCID, timestamp.getTime(), actorAddress);
    
    const eventEntry = await createEventLedgerEntry({
      batchId,
      eventName: 'GRAIN_FILLING',
      eventData,
      ipfsCids,
      timestamp,
      role: 'farmer',
      txHash
    });
    
    res.json({
      success: true,
      message: 'Grain filling event recorded successfully',
      block: {
        eventName: eventEntry.eventName,
        currentHash: eventEntry.currentHash,
        txHash: eventEntry.txHash,
        timestamp: eventEntry.timestamp
      }
    });
  } catch (error) {
    console.error('❌ Grain filling event error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// EVENT 5: Harvesting & Quality Verification
router.post('/event/harvest', upload.fields([
  { name: 'labReportFile', maxCount: 1 },
  { name: 'organicCertificationFile', maxCount: 1 },
  { name: 'imageHarvestPhoto', maxCount: 1 },
  { name: 'imageGrainCloseup', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      batchId,
      harvestDate,
      totalYieldKg,
      moisturePercentAtHarvest,
      grainGrade,
      storageMethod,
      warehouseId
    } = req.body;
    
    if (!batchId) {
      return res.status(400).json({ success: false, message: 'batchId is required' });
    }
    
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const pdfTypes = ['application/pdf'];
    const ipfsCids = [];
    const fileMetadata = {};
    
    // Validate and upload all files
    const fileFields = [
      { name: 'labReportFile', types: pdfTypes, maxSize: 10 * 1024 * 1024 },
      { name: 'organicCertificationFile', types: pdfTypes, maxSize: 10 * 1024 * 1024 },
      { name: 'imageHarvestPhoto', types: imageTypes, maxSize: 5 * 1024 * 1024 },
      { name: 'imageGrainCloseup', types: imageTypes, maxSize: 5 * 1024 * 1024 }
    ];
    
    for (const field of fileFields) {
      if (req.files[field.name]) {
        const validation = validateFile(req.files[field.name][0], field.types, field.maxSize);
        if (!validation.valid) {
          return res.status(400).json({ success: false, message: validation.error });
        }
        const result = await handleFileUpload(req.files[field.name][0]);
        if (result.success && result.ipfsHash) {
          ipfsCids.push(result.ipfsHash);
          fileMetadata[field.name] = { cid: result.ipfsHash, filename: req.files[field.name][0].originalname };
        }
      }
    }
    
    const primaryCID = ipfsCids[0] || '';
    const timestamp = new Date();
    
    const eventData = {
      batchId,
      harvestDate,
      totalYieldKg,
      moisturePercentAtHarvest,
      grainGrade,
      storageMethod,
      warehouseId,
      fileMetadata
    };
    
    const latestEvent = await EventLedger.findOne({ productId: batchId }).sort({ timestamp: -1 });
    const farmerId = latestEvent?.eventData?.farmerId;
    const farmer = farmerId ? await Farmer.findById(farmerId) : null;
    const actorAddress = farmer?.walletAddress || process.env.DEFAULT_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';
    
    const txHash = await callSmartContract('HARVEST', batchId, primaryCID, timestamp.getTime(), actorAddress);
    
    const eventEntry = await createEventLedgerEntry({
      batchId,
      eventName: 'HARVEST',
      eventData,
      ipfsCids,
      timestamp,
      role: 'farmer',
      txHash
    });
    
    // Check if product needs to be created
    let product = await Product.findOne({ batchId });
    if (!product) {
      // Get location from first event (sowing) which should have gpsLocation
      const sowingEvent = await EventLedger.findOne({ 
        productId: batchId, 
        eventName: 'SOWING' 
      }).sort({ timestamp: 1 });
      
      const productLocation = sowingEvent?.eventData?.gpsLocation || 
                               latestEvent?.eventData?.gpsLocation || 
                               'Location not specified';
      
      // Create product record with all required fields
      // Generate a shorter, readable product name
      const harvestDateObj = harvestDate ? new Date(harvestDate) : new Date();
      const productName = `Wheat - ${harvestDateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${parseFloat(totalYieldKg) || 0}kg`;
      
      // Only create product if we have a valid farmerId
      if (!farmerId || !mongoose.Types.ObjectId.isValid(farmerId)) {
        throw new Error('Valid farmerId is required to create product');
      }
      
      product = new Product({
        batchId,
        productType: 'Wheat',
        name: productName,
        description: 'Wheat product from lifecycle tracking - Harvest completed',
        category: 'grains',
        farmerId: farmerId,
        price: 0, // Will be set later
        quantity: parseFloat(totalYieldKg) || 0,
        location: productLocation, // Required field - get from sowing event
        harvestDate: harvestDateObj,
        moisture: parseFloat(moisturePercentAtHarvest) || 0,
        protein: 0, // Will be updated from lab report if available
        pesticide: 0, // Default value
        ph: 7.0 // Default neutral pH
      });
      await product.save();
    } else {
      // Update existing product with harvest data
      product.quantity = parseFloat(totalYieldKg) || product.quantity;
      product.harvestDate = harvestDate ? new Date(harvestDate) : product.harvestDate;
      product.moisture = parseFloat(moisturePercentAtHarvest) || product.moisture;
      await product.save();
    }
    
    // Generate certificate and QR automatically
    try {
      // Fetch all events for certificate generation
      const allEvents = await EventLedger.find({ productId: batchId }).sort({ timestamp: 1 }).lean();
      
      if (allEvents.length > 0) {
        // Get farmer info
        const firstEvent = allEvents[0];
        const certFarmerId = firstEvent.eventData?.farmerId;
        const certFarmer = certFarmerId ? await Farmer.findById(certFarmerId).lean() : null;
        
        // Get product summary from harvest event
        const harvestEventData = allEvents.find(e => e.eventName === 'HARVEST');
        const productSummary = harvestEventData ? {
          yield: harvestEventData.eventData?.totalYieldKg,
          moisture: harvestEventData.eventData?.moisturePercentAtHarvest,
          grade: harvestEventData.eventData?.grainGrade
        } : {};
        
        // Compile certificate JSON
        const certificateData = {
          batchId,
          farmerId: certFarmerId || null,
          farmerInfo: certFarmer ? {
            name: certFarmer.name,
            email: certFarmer.email,
            phone: certFarmer.phone
          } : null,
          events: allEvents.map(event => ({
            eventName: event.eventName,
            timestamp: event.timestamp,
            ipfsCids: event.ipfsCids,
            currentHash: event.currentHash,
            prevHash: event.prevHash,
            txHash: event.txHash
          })),
          productSummary,
          generatedAt: new Date().toISOString()
        };
        
        // Upload certificate to Pinata
        const { ipfsHash: certificateCID } = await uploadJSONToPinata(
          certificateData,
          {
            name: `certificate-${batchId}.json`,
            keyvalues: {
              type: 'certificate',
              batchId: batchId
            }
          }
        );
        
        // Create CERTIFICATE_GENERATED event
        const certTimestamp = new Date();
        const certLatestEvent = allEvents[allEvents.length - 1];
        const certPrevHash = certLatestEvent.currentHash;
        
        const certHashData = {
          productId: batchId,
          eventName: 'CERTIFICATE_GENERATED',
          eventData: { certificateCID },
          timestamp: certTimestamp.toISOString(),
          ipfsCids: [certificateCID],
          prevHash: certPrevHash
        };
        
        const certCurrentHash = computeHash(certHashData);
        const certTxHash = await callSmartContract('CERTIFICATE_GENERATED', batchId, certificateCID, certTimestamp.getTime(), actorAddress);
        
        const certEvent = new EventLedger({
          productId: batchId,
          eventName: 'CERTIFICATE_GENERATED',
          eventData: { certificateCID },
          timestamp: certTimestamp,
          role: 'farmer',
          ipfsCids: [certificateCID],
          prevHash: certPrevHash,
          currentHash: certCurrentHash,
          txHash: certTxHash
        });
        
        await certEvent.save();
        
        // Generate QR code with certificate link
        const qrDir = path.join(process.cwd(), 'uploads', 'qrs');
        if (!fs.existsSync(qrDir)) {
          fs.mkdirSync(qrDir, { recursive: true });
        }
        
        const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
        const qrUrl = `${serverUrl}/wheat/certificate/${certificateCID}`;
        const qrFileName = `${product._id || batchId}-certificateQR.png`;
        const qrFullPath = path.join(qrDir, qrFileName);
        
        await QRCode.toFile(qrFullPath, qrUrl);
        const qrPath = `/uploads/qrs/${qrFileName}`;
        
        // Update product with QR path and certificate CID
        product.qrPath = qrPath;
        product.certificateCID = certificateCID;
        await product.save();
        
        // Create QR_GENERATED event
        const qrTimestamp = new Date();
        const qrPrevHash = certCurrentHash;
        
        const qrHashData = {
          productId: batchId,
          eventName: 'QR_GENERATED',
          eventData: { qrUrl, qrPath, certificateCID },
          timestamp: qrTimestamp.toISOString(),
          ipfsCids: [],
          prevHash: qrPrevHash
        };
        
        const qrCurrentHash = computeHash(qrHashData);
        const qrTxHash = await callSmartContract('QR_GENERATED', batchId, certificateCID, qrTimestamp.getTime(), actorAddress);
        
        const qrEvent = new EventLedger({
          productId: batchId,
          eventName: 'QR_GENERATED',
          eventData: { qrUrl, qrPath, certificateCID },
          timestamp: qrTimestamp,
          role: 'farmer',
          ipfsCids: [],
          prevHash: qrPrevHash,
          currentHash: qrCurrentHash,
          txHash: qrTxHash
        });
        
        await qrEvent.save();
      }
    } catch (certError) {
      console.warn('⚠️ Certificate/QR generation failed (non-critical):', certError.message);
    }
    
    // Ensure product is saved with latest data
    await product.save();
    
    res.json({
      success: true,
      message: 'Harvest event recorded successfully. Product added to marketplace.',
      productId: product._id,
      qrPath: product.qrPath,
      certificateCID: product.certificateCID,
      block: {
        eventName: eventEntry.eventName,
        currentHash: eventEntry.currentHash,
        txHash: eventEntry.txHash,
        timestamp: eventEntry.timestamp
      }
    });
  } catch (error) {
    console.error('❌ Harvest event error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generate Certificate
router.post('/generateCertificate/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    // Fetch all events for this batchId
    const events = await EventLedger.find({ productId: batchId }).sort({ timestamp: 1 }).lean();
    
    if (events.length === 0) {
      return res.status(404).json({ success: false, message: 'No events found for this batch' });
    }
    
    // Get farmer info from first event
    const firstEvent = events[0];
    const farmerId = firstEvent.eventData?.farmerId;
    const farmer = farmerId ? await Farmer.findById(farmerId).lean() : null;
    
    // Get product info
    const product = await Product.findOne({ batchId }).lean();
    
    // Extract product summary from harvest event
    const harvestEvent = events.find(e => e.eventName === 'HARVEST');
    const productSummary = harvestEvent ? {
      yield: harvestEvent.eventData?.totalYieldKg,
      moisture: harvestEvent.eventData?.moisturePercentAtHarvest,
      grade: harvestEvent.eventData?.grainGrade
    } : {};
    
    // Compile certificate JSON
    const certificateData = {
      batchId,
      farmerId: farmerId || null,
      farmerInfo: farmer ? {
        name: farmer.name,
        email: farmer.email,
        phone: farmer.phone
      } : null,
      events: events.map(event => ({
        eventName: event.eventName,
        timestamp: event.timestamp,
        ipfsCids: event.ipfsCids,
        currentHash: event.currentHash,
        prevHash: event.prevHash,
        txHash: event.txHash
      })),
      productSummary,
      generatedAt: new Date().toISOString()
    };
    
    // Upload certificate to Pinata
    const { ipfsHash: certificateCID } = await uploadJSONToPinata(
      certificateData,
      {
        name: `certificate-${batchId}.json`,
        keyvalues: {
          type: 'certificate',
          batchId: batchId
        }
      }
    );
    
    // Create CERTIFICATE_GENERATED event
    const timestamp = new Date();
    const latestEvent = events[events.length - 1];
    const prevHash = latestEvent.currentHash;
    
    const hashData = {
      productId: batchId,
      eventName: 'CERTIFICATE_GENERATED',
      eventData: { certificateCID },
      timestamp: timestamp.toISOString(),
      ipfsCids: [certificateCID],
      prevHash
    };
    
    const currentHash = computeHash(hashData);
    
    const farmerForCert = farmerId ? await Farmer.findById(farmerId) : null;
    const actorAddress = farmerForCert?.walletAddress || process.env.DEFAULT_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';
    
    const txHash = await callSmartContract('CERTIFICATE_GENERATED', batchId, certificateCID, timestamp.getTime(), actorAddress);
    
    const certEvent = new EventLedger({
      productId: batchId,
      eventName: 'CERTIFICATE_GENERATED',
      eventData: { certificateCID },
      timestamp,
      role: 'farmer',
      ipfsCids: [certificateCID],
      prevHash,
      currentHash,
      txHash
    });
    
    await certEvent.save();
    
    // Update product with certificate CID
    if (product) {
      await Product.updateOne({ batchId }, { certificateCID });
    }
    
    res.json({
      success: true,
      certificateCID,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${certificateCID}`,
      block: {
        eventName: certEvent.eventName,
        currentHash: certEvent.currentHash,
        txHash: certEvent.txHash
      }
    });
  } catch (error) {
    console.error('❌ Certificate generation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create PRODUCT_CREATED event (called when farmer decides to create product)
router.post('/event/productCreated', async (req, res) => {
  try {
    const { batchId, farmerId } = req.body;
    
    if (!batchId || !farmerId) {
      return res.status(400).json({ success: false, message: 'batchId and farmerId are required' });
    }
    
    // Get latest event for primary CID
    const latestEvent = await EventLedger.findOne({ productId: batchId }).sort({ timestamp: -1 });
    const primaryCID = latestEvent?.ipfsCids?.[0] || '';
    
    const timestamp = new Date();
    const eventData = {
      batchId,
      farmerId,
      createdAt: timestamp.toISOString()
    };
    
    const farmer = await Farmer.findById(farmerId);
    const actorAddress = farmer?.walletAddress || process.env.DEFAULT_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';
    
    const txHash = await callSmartContract('PRODUCT_CREATED', batchId, primaryCID, timestamp.getTime(), actorAddress);
    
    const eventEntry = await createEventLedgerEntry({
      batchId,
      eventName: 'PRODUCT_CREATED',
      eventData,
      ipfsCids: [primaryCID].filter(Boolean),
      timestamp,
      role: 'farmer',
      txHash
    });
    
    // Create or update product
    let product = await Product.findOne({ batchId });
    if (!product) {
      // Get location from first event (sowing) which should have gpsLocation
      const sowingEvent = await EventLedger.findOne({ 
        productId: batchId, 
        eventName: 'SOWING' 
      }).sort({ timestamp: 1 });
      
      const productLocation = sowingEvent?.eventData?.gpsLocation || 
                               'Location not specified';
      
      product = new Product({
        batchId,
        productType: 'Wheat',
        name: `Wheat Batch ${batchId}`,
        description: 'Wheat product from lifecycle tracking',
        category: 'grains',
        farmerId,
        price: 0,
        quantity: 0,
        location: productLocation, // Required field - get from sowing event
        harvestDate: new Date(),
        moisture: 0,
        protein: 0,
        pesticide: 0,
        ph: 7.0 // Default neutral pH
      });
    }
    await product.save();
    
    res.json({
      success: true,
      message: 'Product created successfully',
      block: {
        eventName: eventEntry.eventName,
        currentHash: eventEntry.currentHash,
        txHash: eventEntry.txHash,
        timestamp: eventEntry.timestamp
      },
      productId: product._id
    });
  } catch (error) {
    console.error('❌ Product created event error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update QR code when distributor/retailer events happen
router.post('/updateQR/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const qrPath = await updateProductQR(batchId);
    
    if (qrPath) {
      res.json({ success: true, qrPath, message: 'QR code updated successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Product or certificate not found' });
    }
  } catch (error) {
    console.error('❌ QR update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
export { updateProductQR };

