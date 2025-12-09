import crypto from 'crypto';
import mongoose from 'mongoose';
import EventLedger from '../models/EventLedger.js';
import Product from '../models/Product.js';
import { uploadJSONToPinata } from './pinataUpload.js';

// In-memory cache for the latest block hashes
const latestBlockHashes = new Map();

// Canonical JSON stringify to ensure consistent key ordering
function canonicalStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  
  if (Array.isArray(obj)) {
    return `[${obj.map(item => canonicalStringify(item)).join(',')}]`;
  }
  
  const sorted = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = obj[key];
  });
  
  return `{${Object.entries(sorted)
    .map(([k, v]) => `"${k}":${canonicalStringify(v)}`)
    .join(',')}}`;
}

// Calculate hash for a block
export function calculateBlockHash(blockData) {
  const dataString = canonicalStringify(blockData);
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

// Get the latest block for a product
async function getLatestBlock(productId) {
  // Try to get from cache first
  if (latestBlockHashes.has(productId.toString())) {
    return {
      currentHash: latestBlockHashes.get(productId.toString())
    };
  }
  
  // If not in cache, query the database
  const latestBlock = await EventLedger.findOne(
    { productId },
    'currentHash',
    { sort: { timestamp: -1 } }
  ).lean();
  
  // Update cache
  if (latestBlock) {
    latestBlockHashes.set(productId.toString(), latestBlock.currentHash);
  }
  
  return latestBlock || { currentHash: null };
}

// Create a new event block
export async function createEventBlock({
  productId,
  eventName,
  actorRole,
  actorId,
  eventData = {},
  ipfsCIDs = [],
  txHash = null,
  contractAddress = null
}) {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error('Invalid productId');
  }

  // Get the latest block for this product to get the previous hash
  const { currentHash: previousHash } = await getLatestBlock(productId);
  
  // Create the block data
  const blockData = {
    productId: new mongoose.Types.ObjectId(productId),
    eventName,
    actorRole,
    actorId: new mongoose.Types.ObjectId(actorId),
    eventData,
    ipfsCIDs,
    timestamp: new Date(),
    previousHash,
    txHash,
    contractAddress
  };
  
  // Calculate the current hash (excludes currentHash from the hash calculation)
  const { currentHash, ...blockDataForHash } = blockData;
  const calculatedHash = calculateBlockHash(blockDataForHash);
  
  // Add the calculated hash to the block
  blockData.currentHash = calculatedHash;
  
  // Check for duplicate event
  const existingEvent = await EventLedger.findOne({
    productId: blockData.productId,
    eventName: blockData.eventName,
    actorRole: blockData.actorRole,
    actorId: blockData.actorId,
    // Check if the same event happened in the last 5 minutes to prevent duplicates
    timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
  });
  
  if (existingEvent) {
    return existingEvent;
  }
  
  // Create and save the event block
  const eventBlock = new EventLedger(blockData);
  const savedBlock = await eventBlock.save();
  
  // Update the cache
  latestBlockHashes.set(productId.toString(), savedBlock.currentHash);
  
  return savedBlock;
}

// Get the full event ledger for a product
export async function getEventLedger(productId) {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error('Invalid productId');
  }
  
  return EventLedger.find({ productId })
    .sort('timestamp')
    .lean();
}

// Generate certificate for a product
export async function generateCertificate(productId) {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error('Invalid productId');
  }
  
  // Get the product with populated fields
  const product = await Product.findById(productId)
    .populate('farmerId', 'name farmName location mobile')
    .populate('distributorId', 'name companyName location mobile')
    .populate('retailerId', 'name companyName location mobile')
    .lean();
  
  if (!product) {
    throw new Error('Product not found');
  }
  
  // Get all events for this product
  const events = await getEventLedger(productId);
  
  // Extract important information for the certificate
  const certificateData = {
    productId: product._id,
    productName: product.name,
    category: product.category,
    harvestDate: product.harvestDate,
    createdAt: product.createdAt,
    
    // Participant information
    farmer: product.farmerId ? {
      name: product.farmerId.name,
      farmName: product.farmerId.farmName,
      location: product.farmerId.location,
      contact: product.farmerId.mobile
    } : null,
    
    distributor: product.distributorId ? {
      name: product.distributorId.name,
      companyName: product.distributorId.companyName,
      location: product.distributorId.location,
      contact: product.distributorId.mobile
    } : null,
    
    retailer: product.retailerId ? {
      name: product.retailerId.name,
      companyName: product.retailerId.companyName,
      location: product.retailerId.location,
      contact: product.retailerId.mobile
    } : null,
    
    // Event timeline
    events: events.map(event => ({
      eventName: event.eventName,
      timestamp: event.timestamp,
      actorRole: event.actorRole,
      ipfsCIDs: event.ipfsCIDs,
      txHash: event.txHash
    })),
    
    // Final product details
    finalDetails: {
      price: product.price,
      quantity: product.quantity,
      image: product.image,
      upgradedImage: product.upgradedImage,
      finalImage: product.finalImage,
      qualityMetrics: {
        moisture: product.moisture,
        protein: product.protein,
        pesticideResidue: product.pesticideResidue,
        soilPh: product.soilPh
      }
    },
    
    // Certificate metadata
    certificate: {
      generatedAt: new Date(),
      version: '1.0.0',
      blockchain: {
        contractAddress: process.env.CONTRACT_ADDRESS || '0x0',
        network: process.env.NETWORK_NAME || 'local'
      }
    }
  };
  
  // Upload certificate to IPFS
  const { ipfsHash: certificateCID } = await uploadJSONToPinata(
    certificateData,
    { 
      name: `certificate-${productId}.json`,
      keyvalues: {
        type: 'certificate',
        productId: productId.toString()
      }
    }
  );
  
  // Update the product with the certificate CID
  await Product.findByIdAndUpdate(productId, { 
    certificateCID,
    certificateUrl: `https://gateway.pinata.cloud/ipfs/${certificateCID}`
  });
  
  return {
    success: true,
    certificateCID,
    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${certificateCID}`,
    productId: product._id
  };
}

// Verify the integrity of the event ledger for a product
export async function verifyLedgerIntegrity(productId) {
  const events = await getEventLedger(productId);
  const results = [];
  
  for (let i = 0; i < events.length; i++) {
    const current = events[i];
    const previous = i > 0 ? events[i - 1] : null;
    
    // Verify previous hash matches
    if (i > 0 && current.previousHash !== previous.currentHash) {
      results.push({
        index: i,
        eventName: current.eventName,
        status: 'invalid',
        message: `Previous hash mismatch. Expected ${current.previousHash}, got ${previous?.currentHash}`
      });
      continue;
    }
    
    // Verify current hash is valid
    const { currentHash, ...blockData } = current;
    const calculatedHash = calculateBlockHash(blockData);
    
    if (calculatedHash !== currentHash) {
      results.push({
        index: i,
        eventName: current.eventName,
        status: 'invalid',
        message: `Hash verification failed. Expected ${currentHash}, got ${calculatedHash}`
      });
      continue;
    }
    
    results.push({
      index: i,
      eventName: current.eventName,
      status: 'valid',
      message: 'Block is valid'
    });
  }
  
  return {
    productId,
    totalBlocks: events.length,
    validBlocks: results.filter(r => r.status === 'valid').length,
    invalidBlocks: results.filter(r => r.status === 'invalid').length,
    results
  };
}

export default {
  createEventBlock,
  getEventLedger,
  generateCertificate,
  verifyLedgerIntegrity,
  calculateBlockHash
};
