import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { createEventBlock, generateCertificate, getEventLedger } from '../services/blockchainEvent.js';
import Product from '../models/Product.js';
import Farmer from '../models/Farmer.js';
import Distributor from '../models/Distributor.js';
import Retailer from '../models/Retailer.js';
import { uploadFileToPinata, uploadJSONToPinata, isImageFile, handleFileUpload } from '../services/pinataUpload.js';
import QRCode from 'qrcode';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'image' || file.fieldname === 'upgradedImage' || file.fieldname === 'finalProductImage') {
      if (!isImageFile(file)) {
        return cb(new Error('Only image files are allowed!'), false);
      }
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper function to handle errors
const handleError = (res, error, statusCode = 500) => {
  console.error('Error:', error);
  res.status(statusCode).json({ 
    success: false, 
    message: error.message || 'An error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

// 1. Product Created
router.post('/product-created', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'labReport', maxCount: 1 }
]), async (req, res) => {
  try {
    const { productId, farmerId, name, category, price, quantity, harvestDate, preferences } = req.body;
    
    // Upload files to IPFS
    const ipfsCIDs = [];
    
    if (req.files?.image?.[0]) {
      const result = await handleFileUpload(req.files.image[0]);
      ipfsCIDs.push(result);
      
      // Update product with image URL
      await Product.findByIdAndUpdate(productId, { image: result });
    }
    
    if (req.files?.labReport?.[0]) {
      const result = await handleFileUpload(req.files.labReport[0]);
      ipfsCIDs.push(result);
    }
    
    // Create the event block
    const eventBlock = await createEventBlock({
      productId,
      eventName: 'PRODUCT_CREATED',
      actorRole: 'farmer',
      actorId: farmerId,
      eventData: {
        name,
        category,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        harvestDate,
        preferences: JSON.parse(preferences || '[]')
      },
      ipfsCIDs
    });
    
    res.json({ success: true, eventBlock });
  } catch (error) {
    handleError(res, error);
  }
});

// 2. Sent to Distributor
router.post('/sent-to-distributor', async (req, res) => {
  try {
    const { productId, farmerId, distributorId } = req.body;
    
    // Update product with distributor
    await Product.findByIdAndUpdate(productId, { distributorId });
    
    // Create the event block
    const eventBlock = await createEventBlock({
      productId,
      eventName: 'SENT_TO_DISTRIBUTOR',
      actorRole: 'farmer',
      actorId: farmerId,
      eventData: { distributorId }
    });
    
    res.json({ success: true, eventBlock });
  } catch (error) {
    handleError(res, error);
  }
});

// 3. Distributor Accepted
router.post('/distributor-accepted', async (req, res) => {
  try {
    const { productId, distributorId } = req.body;
    
    // Create the event block
    const eventBlock = await createEventBlock({
      productId,
      eventName: 'DISTRIBUTOR_ACCEPTED',
      actorRole: 'distributor',
      actorId: distributorId
    });
    
    res.json({ success: true, eventBlock });
  } catch (error) {
    handleError(res, error);
  }
});

// 4. Checkout Initiated by Distributor
router.post('/checkout-initiated-by-distributor', async (req, res) => {
  try {
    const { productId, distributorId, checkoutMeta } = req.body;
    
    // Update product owner to distributor
    await Product.findByIdAndUpdate(productId, { owner: distributorId });
    
    // Create the event block
    const eventBlock = await createEventBlock({
      productId,
      eventName: 'CHECKOUT_INITIATED_BY_DISTRIBUTOR',
      actorRole: 'distributor',
      actorId: distributorId,
      eventData: { checkoutMeta: JSON.parse(checkoutMeta || '{}') }
    });
    
    res.json({ success: true, eventBlock });
  } catch (error) {
    handleError(res, error);
  }
});

// 5. Product Upgraded by Distributor
router.post('/product-upgraded-by-distributor', upload.single('upgradedImage'), async (req, res) => {
  try {
    const { productId, distributorId, ...upgradeData } = req.body;
    let ipfsCIDs = [];
    
    // Handle upgraded image if provided
    if (req.file) {
      const result = await handleFileUpload(req.file);
      ipfsCIDs.push(result);
      
      // Update product with upgraded image
      await Product.findByIdAndUpdate(productId, { 
        upgradedImage: result,
        ...(upgradeData.boughtDate ? { boughtDate: new Date(upgradeData.boughtDate) } : { boughtDate: new Date() })
      });
    }
    
    // Create the event block
    const eventBlock = await createEventBlock({
      productId,
      eventName: 'PRODUCT_UPGRADED_BY_DISTRIBUTOR',
      actorRole: 'distributor',
      actorId: distributorId,
      eventData: upgradeData,
      ipfsCIDs
    });
    
    res.json({ success: true, eventBlock });
  } catch (error) {
    handleError(res, error);
  }
});

// 6. Product Listed in Distributor Marketplace
router.post('/product-listed-in-distributor-marketplace', async (req, res) => {
  try {
    const { productId, distributorId } = req.body;
    
    // Create the event block
    const eventBlock = await createEventBlock({
      productId,
      eventName: 'PRODUCT_LISTED_IN_DISTRIBUTOR_MARKETPLACE',
      actorRole: 'distributor',
      actorId: distributorId
    });
    
    res.json({ success: true, eventBlock });
  } catch (error) {
    handleError(res, error);
  }
});

// 7. Retailer Requested to Buy
router.post('/retailer-requested-to-buy', async (req, res) => {
  try {
    const { productId, retailerId } = req.body;
    
    // Create the event block
    const eventBlock = await createEventBlock({
      productId,
      eventName: 'RETAILER_REQUESTED_TO_BUY',
      actorRole: 'retailer',
      actorId: retailerId
    });
    
    res.json({ success: true, eventBlock });
  } catch (error) {
    handleError(res, error);
  }
});

// 8. Distributor Logistics Added
router.post('/distributor-logistics-added', async (req, res) => {
  try {
    const { productId, distributorId, logistics } = req.body;
    
    // Parse logistics data
    const logisticsData = typeof logistics === 'string' ? JSON.parse(logistics) : logistics;
    
    // Create the event block
    const eventBlock = await createEventBlock({
      productId,
      eventName: 'DISTRIBUTOR_LOGISTICS_ADDED',
      actorRole: 'distributor',
      actorId: distributorId,
      eventData: { logistics: logisticsData }
    });
    
    res.json({ success: true, eventBlock });
  } catch (error) {
    handleError(res, error);
  }
});

// 9. Retailer Checkout Initiated
router.post('/retailer-checkout-initiated', async (req, res) => {
  try {
    const { productId, retailerId, paymentMeta } = req.body;
    
    // Create the event block
    const eventBlock = await createEventBlock({
      productId,
      eventName: 'RETAILER_CHECKOUT_INITIATED',
      actorRole: 'retailer',
      actorId: retailerId,
      eventData: { paymentMeta: JSON.parse(paymentMeta || '{}') }
    });
    
    res.json({ success: true, eventBlock });
  } catch (error) {
    handleError(res, error);
  }
});

// 10. Retailer Accepted Delivery
router.post('/retailer-accepted-delivery', upload.single('finalProductImage'), async (req, res) => {
  try {
    const { productId, retailerId, finalQualityNotes, arrivalDefects, weightDifference, spoilagePercentage, finalPrice } = req.body;
    let ipfsCIDs = [];
    
    // Handle final product image if provided
    if (req.file) {
      const result = await handleFileUpload(req.file);
      ipfsCIDs.push(result);
      
      // Update product with final image
      await Product.findByIdAndUpdate(productId, { 
        finalImage: result,
        finalQualityNotes,
        owner: retailerId,
        retailerId,
        finalPrice: parseFloat(finalPrice)
      });
    }
    
    // Create the event block
    const eventBlock = await createEventBlock({
      productId,
      eventName: 'RETAILER_ACCEPTED_DELIVERY',
      actorRole: 'retailer',
      actorId: retailerId,
      eventData: {
        finalQualityNotes,
        arrivalDefects: JSON.parse(arrivalDefects || '[]'),
        weightDifference: parseFloat(weightDifference || 0),
        spoilagePercentage: parseFloat(spoilagePercentage || 0),
        finalPrice: parseFloat(finalPrice || 0)
      },
      ipfsCIDs
    });
    
    res.json({ success: true, eventBlock });
  } catch (error) {
    handleError(res, error);
  }
});

// 11. Certificate Generated
router.post('/certificate-generated', async (req, res) => {
  try {
    const { productId } = req.body;
    
    // Generate certificate
    const { certificateCID, gatewayUrl } = await generateCertificate(productId);
    
    // Create the event block
    const eventBlock = await createEventBlock({
      productId,
      eventName: 'CERTIFICATE_GENERATED',
      actorRole: 'system',
      actorId: new mongoose.Types.ObjectId(), // System generated
      eventData: { certificateCID, gatewayUrl }
    });
    
    res.json({ 
      success: true, 
      eventBlock,
      certificateCID,
      gatewayUrl
    });
  } catch (error) {
    handleError(res, error);
  }
});

// 12. QR Generated
router.post('/qr-generated', async (req, res) => {
  try {
    const { productId, certificateUrl } = req.body;
    
    if (!certificateUrl) {
      throw new Error('certificateUrl is required');
    }
    
    // Generate QR code
    const qrPath = `uploads/qrs/${productId}-certificate-qr.png`;
    const dir = path.dirname(qrPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    await QRCode.toFile(qrPath, certificateUrl, {
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      width: 400,
      margin: 1
    });
    
    // Update product with QR code path
    await Product.findByIdAndUpdate(productId, { qrPath });
    
    // Create the event block
    const eventBlock = await createEventBlock({
      productId,
      eventName: 'QR_GENERATED',
      actorRole: 'system',
      actorId: new mongoose.Types.ObjectId(), // System generated
      eventData: { qrPath, certificateUrl }
    });
    
    res.json({ 
      success: true, 
      eventBlock,
      qrPath: `/${qrPath}` // Return relative path
    });
  } catch (error) {
    handleError(res, error);
  }
});

// Get event ledger for a product
router.get('/ledger/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const events = await getEventLedger(productId);
    res.json({ success: true, events });
  } catch (error) {
    handleError(res, error);
  }
});

// Get certificate for a product
router.get('/certificate/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    if (!product.certificateCID) {
      return res.status(404).json({ success: false, message: 'Certificate not generated yet' });
    }
    
    res.json({ 
      success: true, 
      certificateCID: product.certificateCID,
      certificateUrl: `https://gateway.pinata.cloud/ipfs/${product.certificateCID}`
    });
  } catch (error) {
    handleError(res, error);
  }
});

export default router;
