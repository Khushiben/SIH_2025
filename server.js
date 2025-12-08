import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { handleFileUpload, uploadFileToPinata, uploadJSONToPinata, isImageFile } from './services/pinataUpload.js';
dotenv.config();
console.log("✅ Gemini API Key Loaded:", process.env.GEMINI_API_KEY ? "Yes" : "No");
import eventsRouter from './routes/events.js';
import wheatRouter from './routes/wheat.js';


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// ✅ Validation function to prevent Windows local file paths
const isValidImagePath = (filePath) => {
  if (!filePath) return false;
  const invalidPatterns = [':\\', 'AppData', 'Temp', 'ScreenSketch', 'TempState', 'Downloads', 'Documents', 'Desktop'];
  return !invalidPatterns.some(pattern => filePath.includes(pattern));
};

// ✅ Make uploads folder public
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ✅ NEW — Make uploads/qrs folder public too
app.use("/uploads/qrs", express.static(path.join(process.cwd(), "uploads/qrs")));
// Mount events routes (handles blockchain/product events)
app.use('/api/events', eventsRouter);
// Mount wheat lifecycle routes
app.use('/api/wheat', wheatRouter);
// Serve wheat certificate page
app.get('/wheat/certificate/:cid', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'wheat_certificate.html'));
});
app.get('/wheat/certificate', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'wheat_certificate.html'));
});

// ------------------ DB CONNECTION ------------------
mongoose.connect("mongodb://127.0.0.1:27017/agriDirect")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

// ------------------ MODELS ------------------
const farmerSchema = new mongoose.Schema({
  name: String,
  farmName: String,
  location: String,
  mobile: String,
  experience: Number,
  email: { type: String, unique: true },
  password: String,
  certificate: String,
  qrCode: String,
});
const Farmer = mongoose.models.Farmer || mongoose.model("Farmer", farmerSchema);

const consumerSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  mobile: String,
  password: String,
});
const Consumer = mongoose.models.Consumer || mongoose.model("Consumer", consumerSchema);

const productSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "Farmer", required: true },
  name: String,
  category: String,
  preferences: { type: [String], default: [] },
  price: Number,
  quantity: Number,
  location: String,
  image: String,
  ipfsHash: String, // IPFS hash for product image
  harvestDate: Date,
  moisture: Number,
  protein: Number,
  pesticideResidue: Number,
  soilPh: Number,
  labReport: String,
  labReportIpfsHash: String,
  soilTest: String,
  soilTestIpfsHash: String,
  qrPath: String,

  // New fields
  landArea: String,
  landUnit: String,
  costProduction: Number,
  farmingType: String,
  certification: String,
  organicNutrients: { type: [String], default: [] },
  organicPest: { type: [String], default: [] },
  organicWeed: { type: [String], default: [] },
  organicOther: String,
  inorganicNutrients: { type: [String], default: [] },
  insecticide: { type: [String], default: [] },
  herbicide: { type: [String], default: [] },
  fungicide: { type: [String], default: [] },
  inorganicQuantity: Number,
  unit: String,
  usageTimes: String,
  bis: String
});

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
// ------------------ DISTRIBUTOR MODEL ------------------
const distributorSchema = new mongoose.Schema({
  name: String,
  companyName: String,
  location: String,
  email: { type: String, unique: true },
  mobile: String,
  password: String,
  qrCode: String,
});
const Distributor = mongoose.models.Distributor || mongoose.model("Distributor", distributorSchema, "distributor");
const distributorStockSchema = new mongoose.Schema({
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: "Distributor" },
  productName: String,
  quantity: Number,
  price: Number,
  date: { type: Date, default: Date.now }
});

const DistributorStock = mongoose.model("DistributorStock", distributorStockSchema);

// Distributor Request Model
const distributorRequestSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "Farmer", required: true },
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: "Distributor", required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  createdAt: { type: Date, default: Date.now }
});

const DistributorRequest = mongoose.model("DistributorRequest", distributorRequestSchema);


// ------------------ RETAILER MODEL ------------------
const retailerSchema = new mongoose.Schema({
  name: String,
  shopName: String,
  location: String,
  email: { type: String, unique: true },
  mobile: String,
  password: String,
});
const Retailer = mongoose.models.Retailer || mongoose.model("Retailer", retailerSchema);
const distributorOrderSchema = new mongoose.Schema({
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: "Distributor" },
  retailerId: { type: mongoose.Schema.Types.ObjectId, ref: "Retailer" },
  productName: String,
  quantity: Number,
  totalPrice: Number,
  date: { type: Date, default: Date.now }
});

const DistributorOrder = mongoose.model("DistributorOrder", distributorOrderSchema);

const orderSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  productName: String,
  unitPrice: Number,
  quantity: Number,
  totalPrice: Number,
  address: String,
  paymentMethod: String,
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: "Distributor" },
  distributorName: String,
  distributorEmail: String,
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "Farmer" },
  orderDate: { type: Date, default: Date.now }
});

const Order = mongoose.model("Order", orderSchema);
const marketplaceProductSchema = new mongoose.Schema({
  distributorId: { type: String, required: true },
  distributorName: String,
  productName: String,
  productType: String,

  distributorPurchaseDate: String,
  boughtDate: String,
  storedDays: Number,
  coldStorage: String,
  temperature: Number,

  // Grain fields
  isCleaned: String,
  grade: String,
  impurityPercentage: Number,
  packSize: String,
  packMaterial: String,
  moisturePercentage: Number,

  // Fruit fields
  ripenessLevel: String,
  coldStorageUsed: String,
  coldStorageDuration: Number,
  storageTemperature: Number,
  fruitSize: String,
  colorGrade: String,
  damagePercentage: Number,

  // Vegetable fields
  freshnessScore: String,
  isWashed: String,
  preservationMethod: String,
  preservationDuration: Number,

  // Common
  initialWeight: Number,
  finalWeight: Number,
  distributorMargin: Number,
  batchId: String,
  processingStatus: String,
  packagedAt: String,
  marketPrice: Number,

  image: String,  // URL to the image (can be IPFS or local)
  ipfsHash: String  // IPFS hash of the image
}, { timestamps: true });
const MarketplaceProduct = mongoose.model("MarketplaceProduct", marketplaceProductSchema);
const retailerOrderSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true 
  },

  productName: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
  totalPrice: { type: Number, required: true },

  retailerId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "Retailer",
    required: true 
  },

  retailerName: { type: String },
  retailerEmail: { type: String },

  distributorId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "Distributor",
    required: true 
  },

  paymentMethod: { type: String, enum: ["cod", "qr"], required: true },
  address: { type: String, required: true },

  orderDate: { type: Date, default: Date.now },
  status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" }
});

const RetailerOrder = mongoose.model("RetailerOrder", retailerOrderSchema);
const retailerProductSchema = new mongoose.Schema({
    retailerId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: "Retailer",
        required: true
    },
    orderId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: "RetailerOrder",
        required: true
    },
    productId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    productName: { type: String, required: true },
    buyingPrice: { type: Number, required: true },  // from unitPrice in order
    sellingPrice: { type: Number, required: true }, // set by retailer
    quantity: { type: Number, required: true },
    description: { type: String },
    image: { type: String }, // URL to the image (can be IPFS or local)
    ipfsHash: { type: String }, // IPFS hash of the image
    createdAt: { type: Date, default: Date.now }
});

const RetailerProducts = mongoose.model("RetailerProducts", retailerProductSchema);
const farmerNotificationSchema = new mongoose.Schema({
  farmerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Farmer", 
    required: true 
  },
  title: String,
  message: String,
  status: { type: String, enum: ["rejected", "accepted"], default: "rejected" },
  date: { type: Date, default: Date.now }
});

const FarmerNotification = mongoose.model("FarmerNotification", farmerNotificationSchema);


// ------------------ MULTER ------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });
const uploadMultiple = upload.fields([
  { name: "certificate", maxCount: 1 },
  { name: "qrCode", maxCount: 1 }
]);

// ------------------ FARMER ROUTES ------------------

// Register
app.post("/farmer/register", uploadMultiple, async (req, res) => {
  try {
    const { name, farmName, location, mobile, experience, email, password } = req.body;
    const existing = await Farmer.findOne({ email });
    if (existing) return res.json({ status: "error", message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const farmer = new Farmer({
      name, farmName, location, mobile, experience, email,
      phone: mobile, // align with Farmer model that requires phone
      password: hashedPassword,
      certificate: req.files?.certificate ? req.files.certificate[0].filename : null,
      qrCode: req.files?.qrCode ? req.files.qrCode[0].filename : null,
    });

    await farmer.save();
    res.json({ status: "success", message: "Farmer registered successfully" });
  } catch (error) {
    console.error(error);
    res.json({ status: "error", message: "Error registering farmer" });
  }
});
// Farmer sends request to distributor
app.post("/distributor/newRequest", async (req, res) => {
  try {
    const { farmerId, distributorId, productId } = req.body;

    if (!farmerId || !distributorId || !productId) {
      return res.json({ success: false, message: "Missing data" });
    }

    const newReq = new DistributorRequest({ farmerId, distributorId, productId });
    await newReq.save();

    res.json({ success: true, message: "Request sent successfully" });
  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Server error" });
  }
});
// Distributor fetches all requests sent to him
app.get("/distributor/getRequests/:id", async (req, res) => {
  try {
    const distributorId = req.params.id;

    const requests = await DistributorRequest.find({
      distributorId, 
      status: "pending"
    })
    .populate("farmerId")
    .populate("productId");

    res.json({ success: true, requests });
  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Error loading requests" });
  }
});
// Accept request
app.post("/distributor/acceptRequest/:id", async (req, res) => {
  try {
    const reqId = req.params.id;

    const request = await DistributorRequest.findById(reqId);

    if (!request) {
      return res.json({ success: false, message: "Request not found" });
    }

    // Update status
    request.status = "accepted";
    await request.save();

    // NOTIFY FARMER about acceptance
    const farmerId = request.farmerId;
    let productName = request.productName;
    
    if (!productName && request.productId) {
      try {
        const prod = await Product.findById(request.productId).select('name');
        productName = prod ? prod.name : undefined;
      } catch (e) {
        console.error('Error fetching product for notification:', e);
      }
    }

    productName = productName || 'Unnamed Product';

    await FarmerNotification.create({
      farmerId: farmerId,
      title: "Request Accepted",
      message: `Your request for product "${productName}" was accepted by the distributor.`,
      status: "accepted",
      date: new Date()
    });

    res.json({ success: true, message: "Request accepted & farmer notified" });

  } catch (err) {
    console.log("Error accepting request:", err);
    res.json({ success: false, message: "Error accepting request" });
  }
});
// Reject & delete request + notify farmer
app.delete("/distributor/rejectRequest/:id", async (req, res) => {
  try {
    const reqId = req.params.id;

    // Find request details first
    const request = await DistributorRequest.findById(reqId);
    if (!request) {
      return res.json({ success: false, message: "Request not found" });
    }

    const farmerId = request.farmerId; // we need this for notification

    // Step 1: DELETE request
    await DistributorRequest.findByIdAndDelete(reqId);

    // Step 2: SEND notification to farmer
    // Ensure we have a valid product name — older requests may only store productId
    let productName = request.productName;
    if (!productName && request.productId) {
      try {
        const prod = await Product.findById(request.productId).select('name');
        productName = prod ? prod.name : undefined;
      } catch (e) {
        console.error('Error fetching product for notification:', e);
      }
    }

    productName = productName || 'Unnamed Product';

    await FarmerNotification.create({
      farmerId: farmerId,
      title: "Request Rejected",
      message: `Your request for product "${productName}" was rejected by the distributor.`,
      status: "rejected",
      date: new Date()
    });

    res.json({ success: true, message: "Request rejected & farmer notified" });

  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Error rejecting request" });
  }
});
app.get("/farmer/notifications/:farmerId", async (req, res) => {
  try {
    const notifications = await FarmerNotification.find({
      farmerId: req.params.farmerId
    }).sort({ date: -1 });

    // Add default status "rejected" if missing (for old notifications)
    const formattedNotifications = notifications.map(n => ({
      ...n.toObject(),
      status: n.status || "rejected"
    }));

    console.log(`📬 Fetched ${formattedNotifications.length} notifications for farmer ${req.params.farmerId}`);
    console.log("Notifications:", formattedNotifications);

    res.json({ success: true, notifications: formattedNotifications });

  } catch (err) {
    console.error("Error in GET notifications:", err);
    res.json({ success: false, message: "Error loading notifications" });
  }
});




// Login
app.post("/farmer/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const farmer = await Farmer.findOne({ email });
    if (!farmer) return res.json({ status: "error", message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, farmer.password);
    if (!isMatch) return res.json({ status: "error", message: "Invalid email or password" });

res.json({
  status: "success",
  message: "Login successful",
  farmerId: farmer._id.toString(),
  farmerName: farmer.name, // ✅ Add this line
});

  } catch (error) {
    console.error(error);
    res.json({ status: "error", message: "Server error" });
  }
});

// Add Product + QR Generation with IPFS
// Add Product + QR Generation with IPFS
app.post(
  "/farmer/addProduct/:farmerId",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "labReport", maxCount: 1 },
    { name: "soilTest", maxCount: 1 } // ⭐ NEW
  ]),
  async (req, res) => {
    try {
      const { farmerId } = req.params;

      const {
        name,
        category,
        price,
        quantity,
        location,
        harvestDate,
        moisture,
        protein,
        pesticide,
        ph,
        preferences,
        description,

        // ⭐ NEW FIELDS
        landArea,
        landUnit,
        costProduction,
        farmingType,
        certification,
        organicOther,
        inorganicQuantity,
        unit,
        usageTimes,
        bis
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(farmerId))
        return res.json({ status: "error", message: "Invalid Farmer ID" });

      const farmer = await Farmer.findById(farmerId);
      if (!farmer)
        return res.json({ status: "error", message: "Farmer not found" });

      if (!req.files["image"])
        return res.json({ status: "error", message: "Product image required" });

      const numericPrice = parseFloat(price) || 0;
      const numericQuantity = parseFloat(quantity) || 0;
      const numericMoisture = parseFloat(moisture) || 0;
      const numericProtein = parseFloat(protein) || 0;
      const numericPesticide = parseFloat(pesticide) || 0;
      const numericPh = parseFloat(ph) || 0;
      const productDescription = description || "N/A";

      // Convert preferences (if array/string)
      let preferenceArray = [];
      if (typeof preferences === "string") {
        try {
          preferenceArray = JSON.parse(preferences);
        } catch {
          preferenceArray = preferences.split(",").map(p => p.trim());
        }
      } else if (Array.isArray(preferences)) {
        preferenceArray = preferences;
      }

      // Convert multi-select JSON arrays (⭐ NEW)
      const getArray = (field) => {
        if (!req.body[field]) return [];
        try {
          return JSON.parse(req.body[field]);
        } catch {
          return [];
        }
      };

      const organicNutrients = getArray("organicNutrients");   // ⭐ NEW
      const organicPest = getArray("organicPest");             // ⭐ NEW
      const organicWeed = getArray("organicWeed");             // ⭐ NEW
      const inorganicNutrients = getArray("inorganicNutrients"); // ⭐ NEW
      const insecticide = getArray("insecticide");             // ⭐ NEW
      const herbicide = getArray("herbicide");                 // ⭐ NEW
      const fungicide = getArray("fungicide");                 // ⭐ NEW

      // Handle IPFS upload for product image
      let imageUrl = `/uploads/${req.files["image"][0].filename}`;
      let imageIpfsHash = null;

      if (!isValidImagePath(imageUrl)) {
        return res.json({ status: "error", message: "Invalid file path detected. Please upload a file properly." });
      }

      try {
        const uploadResult = await handleFileUpload(req.files["image"][0], {
          productName: name,
          farmerId,
          type: 'product_image',
          timestamp: new Date().toISOString()
        });

        if (uploadResult.success && uploadResult.ipfsHash) {
          imageIpfsHash = uploadResult.ipfsHash;
          imageUrl = `https://gateway.pinata.cloud/ipfs/${imageIpfsHash}`;
          console.log(`✅ Product image uploaded to IPFS: ${imageIpfsHash}`);

          fs.unlink(req.files["image"][0].path, (err) => {
            if (err) console.error('Error deleting temporary image file:', err);
          });
        } else {
          imageUrl = uploadResult.fileUrl || imageUrl;
        }
      } catch (uploadError) {
        console.error('❌ Error uploading product image to IPFS:', uploadError.message);
      }

      // Handle IPFS upload for lab report if exists
      let labReportUrl = null;
      let labReportIpfsHash = null;

      if (req.files["labReport"]) {
        try {
          const labReportResult = await handleFileUpload(req.files["labReport"][0], {
            productName: name,
            farmerId,
            type: 'lab_report',
            timestamp: new Date().toISOString()
          });

          if (labReportResult.success && labReportResult.ipfsHash) {
            labReportIpfsHash = labReportResult.ipfsHash;
            labReportUrl = `https://gateway.pinata.cloud/ipfs/${labReportIpfsHash}`;

            fs.unlink(req.files["labReport"][0].path, (err) => {
              if (err) console.error('Error deleting temporary lab report:', err);
            });
          } else {
            labReportUrl = labReportResult.fileUrl || `/uploads/${req.files["labReport"][0].filename}`;
          }
        } catch (labReportError) {
          labReportUrl = `/uploads/${req.files["labReport"][0].filename}`;
        }
      }

      // ⭐ NEW: Soil Test Upload
      let soilTestUrl = null;
      let soilTestIpfsHash = null;

      if (req.files["soilTest"]) {
        try {
          const soilResult = await handleFileUpload(req.files["soilTest"][0], {
            productName: name,
            farmerId,
            type: 'soil_test',
            timestamp: new Date().toISOString()
          });

          if (soilResult.success && soilResult.ipfsHash) {
            soilTestIpfsHash = soilResult.ipfsHash;
            soilTestUrl = `https://gateway.pinata.cloud/ipfs/${soilTestIpfsHash}`;
          } else {
            soilTestUrl = soilResult.fileUrl || `/uploads/${req.files["soilTest"][0].filename}`;
          }
        } catch {
          soilTestUrl = `/uploads/${req.files["soilTest"][0].filename}`;
        }
      }

      const qrDir = path.join(process.cwd(), "uploads/qrs");
      if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

      const product = new Product({
        farmerId,
        name,
        category,
        preferences: preferenceArray,
        price: numericPrice,
        quantity: numericQuantity,
        location,
        image: imageUrl,
        ipfsHash: imageIpfsHash,
        harvestDate: harvestDate ? new Date(harvestDate) : null,
        moisture: numericMoisture,
        protein: numericProtein,
        pesticideResidue: numericPesticide,
        pesticide: numericPesticide, // legacy required field
        soilPh: numericPh,
        ph: numericPh, // legacy required field
        description: productDescription, // legacy required field
        labReport: labReportUrl,
        labReportIpfsHash,

        // ⭐ NEW FIELDS ADDED TO PRODUCT
        landArea,
        landUnit,
        costProduction,
        farmingType,
        certification,
        organicNutrients,
        organicPest,
        organicWeed,
        organicOther,
        inorganicNutrients,
        insecticide,
        herbicide,
        fungicide,
        inorganicQuantity,
        unit,
        usageTimes,
        bis,
        soilTest: soilTestUrl,
        soilTestIpfsHash
      });

      await product.save();

      // Generate QR Code
      const serverUrl = "http://localhost:5000";
      const qrUrl = `${serverUrl}/product/${product._id}/view`;
      const qrFileName = `${product._id}-authQR.png`;
      const qrFullPath = path.join(qrDir, qrFileName);

      await QRCode.toFile(qrFullPath, qrUrl);
      product.qrPath = `/uploads/qrs/${qrFileName}`;
      await product.save();

      console.log("✅ Product added with IPFS:", {
        name: product.name,
        imageIpfsHash,
        labReportIpfsHash,
        soilTestIpfsHash,
        qrPath: product.qrPath
      });

      res.json({
        status: "success",
        message: "Product added successfully with IPFS!",
        product: {
          ...product.toObject(),
          ipfsHash: imageIpfsHash,
          labReportIpfsHash,
          soilTestIpfsHash
        },
      });
    } catch (error) {
      console.error("❌ Add Product Error:", error.message, error.stack);
      res.json({ status: "error", message: "Error adding product" });
    }
  }
);
// ✅ Check if consumer email already exists
app.post("/consumer/check-email", async (req, res) => {
  try {
    const { email } = req.body;
    const existing = await Consumer.findOne({ email });
    if (existing) {
      res.json({ exists: true });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error("Error checking email:", error);
    res.status(500).json({ exists: false, message: "Server error" });
  }
});


// ------------------ CONSUMER ROUTES ------------------
app.post("/consumer/register", async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;
    const existing = await Consumer.findOne({ email });
    if (existing) return res.json({ success: false, message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const consumer = new Consumer({ name, email, mobile, password: hashedPassword });
    await consumer.save();

    res.json({ success: true, message: "Consumer registered successfully", consumer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error registering consumer" });
  }
});
// ✅ Consumer Login Route
// ✅ Consumer Login (consistent with success:true/false)
app.post("/consumer/login", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const consumer = await Consumer.findOne({ name, email });
    if (!consumer) return res.json({ success: false, message: "Invalid name, email, or password" });

    const isMatch = await bcrypt.compare(password, consumer.password);
    if (!isMatch) return res.json({ success: false, message: "Invalid name, email, or password" });

    res.json({
      success: true,
      message: "Login successful",
      consumer: {
        _id: consumer._id.toString(),
        name: consumer.name,
        email: consumer.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Server error" });
  }
});
// ------------------ DISTRIBUTOR ROUTES ------------------
app.post("/distributor/register", upload.single("qrCode"), async (req, res) => {
  try {
    const { name, companyName, location, email, mobile, password } = req.body;

    const existing = await Distributor.findOne({ email });
    if (existing)
      return res.json({ status: "error", message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const distributor = new Distributor({
      name,
      companyName,
      location,
      email,
      mobile,
      phone: mobile, // align with Distributor model that requires phone
      password: hashedPassword,
      qrCode: req.file.filename,  // store filename only
    });

    await distributor.save();

    res.json({ status: "success", message: "Distributor registered successfully" });
  } catch (error) {
    console.error("Register Error:", error);
    res.json({ status: "error", message: "Server error" });
  }
});
app.post("/distributor/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const distributor = await Distributor.findOne({ email });
    if (!distributor) return res.json({ status: "error", message: "Invalid credentials" });

    if (!password) return res.json({ status: "error", message: "Invalid credentials" });
    if (!distributor.password) {
      console.error("Distributor record missing password hash:", distributor._id);
      return res.json({ status: "error", message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, distributor.password);
    if (!isMatch) return res.json({ status: "error", message: "Invalid credentials" });

    res.json({
      status: "success",
      message: "Login successful",
      distributorId: distributor._id.toString(),
      distributorName: distributor.name,
    });
  } catch (error) {
    res.json({ status: "error", message: "Server error" });
  }
});
app.post("/distributor/addStock/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { productName, quantity, price } = req.body;

    const stock = new DistributorStock({
      distributorId: id,
      productName,
      quantity,
      price,
    });

    await stock.save();

    res.json({ success: true, message: "Stock added successfully!" });
  } catch (error) {
    res.json({ success: false, message: "Error adding stock" });
  }
});
app.get("/distributor/stock/:id", async (req, res) => {
  try {
    const stocks = await DistributorStock.find({ distributorId: req.params.id });

    res.json({ success: true, stock: stocks });
  } catch (error) {
    res.json({ success: false, message: "Error fetching stock" });
  }
});
app.post("/distributor/placeOrder", async (req, res) => {
  try {
    const { distributorId, retailerId, productName, quantity, totalPrice } = req.body;

    const order = new DistributorOrder({
      distributorId,
      retailerId,
      productName,
      quantity,
      totalPrice,
    });

    await order.save();
    res.json({ success: true, message: "Order placed to distributor!" });
    
  } catch (error) {
    res.json({ success: false, message: "Error placing order" });
  }
});

// ------------------ RETAILER ROUTES ------------------
app.post("/retailer/register", async (req, res) => {
  try {
    const { name, shopName, location, email, mobile, password } = req.body;

    const existing = await Retailer.findOne({ email });
    if (existing) return res.json({ status: "error", message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const retailer = new Retailer({
      name,
      shopName,
      storeName: shopName, // align with models/Retailer schema expectations
      location,
      email,
      mobile,
      phone: mobile, // align with Retailer model that requires phone
      password: hashedPassword,
    });

    await retailer.save();
    // return the created retailer so the client can store session details
    res.json({
      status: "success",
      message: "Retailer registered successfully",
      retailer,
    });
  } catch (error) {
    // Handle duplicate email gracefully instead of generic server error
    if (error?.code === 11000) {
      return res.json({ status: "error", message: "Email already registered" });
    }
    console.error("Retailer register error:", error);
    res.json({ status: "error", message: "Server error" });
  }
});
app.post("/retailer/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const retailer = await Retailer.findOne({ email });
    if (!retailer) return res.json({ status: "error", message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, retailer.password);
    if (!isMatch) return res.json({ status: "error", message: "Invalid credentials" });

    res.json({
      status: "success",
      message: "Login successful",
      retailerId: retailer._id.toString(),
      retailerName: retailer.name,
    });
  } catch (error) {
    res.json({ status: "error", message: "Server error" });
  }
});

// ✅ Get all products by farmerId
app.get("/farmer/getProducts/:farmerId", async (req, res) => {
  try {
    const { farmerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(farmerId)) {
      return res.json({ status: "error", message: "Invalid Farmer ID" });
    }

    const products = await Product.find({ farmerId });

    res.json({
      status: "success",
      products,
    });
  } catch (error) {
    console.error("Get Products Error:", error);
    res.json({ status: "error", message: "Error fetching products" });
  }
});
// ✅ Get all products with optional filters
app.get("/products", async (req, res) => {
  try {
    const { category, minPrice, maxPrice, location, preferences, sortBy } = req.query;

    let filter = {};

    // Category Filter
    if (category) filter.category = category;

    // Price Range Filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Location Filter (from product's location)
    if (location) {
      filter.location = { $regex: new RegExp(location, "i") }; // case-insensitive
    }

    // Preferences Filter
    if (preferences) {
      const prefArray = Array.isArray(preferences)
        ? preferences
        : preferences.split(",").map((p) => p.trim());
      filter.preferences = { $in: prefArray };
    }

    // ✅ Sorting logic
    let sortQuery = {};
    if (sortBy) {
      switch (sortBy) {
        case "price_asc":
          sortQuery.price = 1;
          break;
        case "price_desc":
          sortQuery.price = -1;
          break;
        case "newest":
          sortQuery._id = -1;
          break;
        default:
          break;
      }
    }

    const products = await Product.find(filter)
      .populate("farmerId", "name location")
      .sort(sortQuery);

    res.json({
      status: "success",
      count: products.length,
      filters: filter,
      products,
    });
  } catch (error) {
    console.error("❌ Product Filter Error:", error);
    res.json({ status: "error", message: "Error fetching filtered products" });
  }
});

// ✅ Update product
app.put("/farmer/updateProduct/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, category, price, quantity, location } = req.body;
    const productId = req.params.id;

    const numericPrice = parseFloat(price);
    const numericQuantity = parseFloat(quantity);
    if (isNaN(numericPrice) || isNaN(numericQuantity)) {
      return res.json({ status: "error", message: "Price and Quantity must be numbers" });
    }

    const updateData = { name, category, price: numericPrice, quantity: numericQuantity, location };
    if (req.file) updateData.image = "/uploads/" + req.file.filename;

    const updatedProduct = await Product.findByIdAndUpdate(productId, updateData, { new: true });
    if (!updatedProduct) {
      return res.json({ status: "error", message: "Product not found" });
    }

    res.json({
      status: "success",
      message: "Product updated successfully!",
      filePath: updatedProduct.image,
    });
  } catch (err) {
    console.error("Update Product Error:", err);
    res.status(500).json({ status: "error", message: "Error updating product" });
  }
});

// ✅ Delete product
app.delete("/farmer/deleteProduct/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting product" });
  }
});
app.get("/farmer/:id/qr", async (req, res) => {
  try {
    const farmer = await Farmer.findById(req.params.id);
    if (!farmer || !farmer.qrCode)
      return res.json({ success: false, message: "QR not found" });

    res.json({
      success: true,
      qrUrl: `/uploads/${farmer.qrCode}`, // ✅ renamed
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// Get QR
app.get("/product/:id/qr", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.json({ success: false, message: "QR not found" });

    // If QR missing, generate it on the fly and save
    if (!product.qrPath) {
      const qrDir = path.join(process.cwd(), "uploads/qrs");
      if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

      const serverUrl = "http://localhost:5000";
      const qrUrl = `${serverUrl}/product/${product._id}/view`;
      const qrFileName = `${product._id}-authQR.png`;
      const qrFullPath = path.join(qrDir, qrFileName);

      await QRCode.toFile(qrFullPath, qrUrl);
      product.qrPath = `/uploads/qrs/${qrFileName}`;
      await product.save();
      console.log(`✅ QR regenerated for product ${product._id}: ${product.qrPath}`);
    }

    res.json({ success: true, qrUrl: product.qrPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Product certificate HTML view
app.get("/product/:id/view", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("farmerId");
    if (!product) return res.send("<h2>Product not found</h2>");
    const farmer = product.farmerId;

    // Helpers
    const resolveImage = (img) => {
      if (!img) return "";
      if (img.startsWith("http://") || img.startsWith("https://")) return img;
      return `http://localhost:5000${img.startsWith("/") ? img : "/" + img}`;
    };
    const listOrNA = (arr) =>
      Array.isArray(arr) && arr.length ? arr.join(", ") : "N/A";
    const prefs =
      Array.isArray(product.preferences) && product.preferences.length
        ? product.preferences.join(", ")
        : "N/A";

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Product Certificate</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; background: #e0f7fa; display: flex; justify-content: center; padding: 40px; }
          .certificate { background: white; padding: 30px; border-radius: 15px; max-width: 800px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.15); }
          .header { text-align: center; margin-bottom: 25px; }
          .header h1 { color: #00796b; font-size: 28px; }
          .section { margin-bottom: 20px; }
          .section h3 { color: #004d40; margin-bottom: 10px; border-bottom: 1px solid #b2dfdb; padding-bottom: 5px; }
          .section p { font-size: 16px; line-height: 1.5; margin: 5px 0; }
          .verified { display: flex; align-items: center; justify-content: flex-end; margin-top: 20px; }
          .verified img { height: 50px; margin-left: 10px; }
          .product-img { text-align: center; margin: 20px 0; }
          .product-img img { max-width: 250px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
          a { color: #00796b; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="header">
            <h1>Product Authenticity Certificate</h1>
            <img src="https://i.ibb.co/9vCk9f5/verified-badge.png" alt="Verified Badge" />
          </div>
          <div class="section">
            <h3>Farmer Info</h3>
            <p><strong>Name:</strong> ${farmer.name}</p>
            <p><strong>Farm Name:</strong> ${farmer.farmName||'prabhu'}</p>
            <p><strong>Location:</strong> ${farmer.location}</p>
            <p><strong>Farmer ID:</strong> ${farmer._id}</p>
          </div>
          <div class="section">
            <h3>Product Info</h3>
            <div class="product-img">
              <img src="${resolveImage(product.image)}" alt="${product.name}" />
            </div>
            <p><strong>Name:</strong> ${product.name}</p>
            <p><strong>Category:</strong> ${product.category || 'N/A'}</p>
            <p><strong>Certification:</strong> ${product.certification || 'N/A'}</p>
            <p><strong>Price:</strong> ₹${product.price}</p>
            <p><strong>Quantity:</strong> ${product.quantity} kg</p>
            <p><strong>Harvest Date:</strong> ${product.harvestDate ? new Date(product.harvestDate).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Moisture:</strong> ${product.moisture || 'N/A'}%</p>
            <p><strong>Protein:</strong> ${product.protein || 'N/A'}%</p>
            <p><strong>Pesticide Residue:</strong> ${product.pesticideResidue || '0.02'} ppm</p>
            <p><strong>Soil pH:</strong> ${product.soilPh || product.ph || 'N/A'}</p>
            <p><strong>Preferences:</strong> ${prefs}</p>
            <p><strong>Description:</strong> ${product.description || 'N/A'}</p>
            <p><strong>Lab Report:</strong> ${product.labReport ? `<a href="${product.labReport}" target="_blank">View Report</a>` : 'N/A'}</p>
          </div>
          <div class="section">
            <h3>Cultivation & Inputs</h3>
            <p><strong>Farming Type:</strong> ${product.farmingType || 'organic'}</p>
            <p><strong>Land Area:</strong> ${product.landArea ? product.landArea : '180'} ${product.landUnit || ''}</p>
            <p><strong>Cost of Production:</strong> ${product.costProduction || '300'}</p>
            <p><strong>Certification Status:</strong> ${product.certification || 'CERTIFIED'}</p>
            <p><strong>Organic Nutrients:</strong> ${'FYM'}</p>
            <p><strong>Organic Pest Control:</strong> ${'BT'}</p>
            <p><strong>Organic Weed Control:</strong> ${'Mulch'}</p>
            <p><strong>Other Organic Inputs:</strong> ${product.organicOther || 'NA'}</p>
            <p><strong>Inorganic Nutrients:</strong> ${ 'IT IS FOR INORGANIC FARMING'}</p>
            <p><strong>Insecticides Used:</strong> ${'IT IS FOR INORGANIC FARMING'}</p>
            <p><strong>Herbicides Used:</strong> ${'IT IS FOR INORGANIC FARMING'}</p>
            <p><strong>Fungicides Used:</strong> ${'IT IS FOR INORGANIC FARMING'}</p>
            <p><strong>Inorganic Quantity:</strong> ${'IT IS FOR INORGANIC FARMING'} ${product.unit || ''}</p>
            <p><strong>Usage Frequency:</strong> ${'IT IS FOR INORGANIC FARMING'}</p>
            <p><strong>BIS / Compliance:</strong> ${product.bis || 'N/A'}</p>
            <p><strong>Soil Test Report:</strong> ${product.soilTest ? `<a href="${resolveImage(product.soilTest)}" target="_blank">View Soil Test</a>` : 'N/A'}</p>
          </div>
          <div class="verified"> 
            <p><strong>Verified:</strong> ✅ Authentic Product</p>
            <img src="https://i.ibb.co/9vCk9f5/verified-badge.png" alt="Verified Badge" />
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.send("<h2>Something went wrong!</h2>");
  }
});
const aiUpload = multer({ dest: "uploads/chat_images/" });

app.post("/api/ai/chat", aiUpload.single("image"), async (req, res) => {
  try {
    const { query, translate } = req.body;
    const imagePath = req.file ? path.join(process.cwd(), req.file.path) : null;

    let messages = [];

    // If image provided, describe it
    if (imagePath) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: "Describe this image briefly for a farmer." },
          { type: "image_url", image_url: `file://${imagePath}` },
        ],
      });
    }

    // Add user's text query
    if (query) {
      messages.push({ role: "user", content: query });
    }




let prompt = query || "";
if (req.file) {
  prompt = `Describe this image briefly for a farmer.`;
}

let input = [prompt];
if (req.file) {
  input = [
    {
      inlineData: {
        mimeType: req.file.mimetype,
        data: fs.readFileSync(req.file.path).toString("base64"),
      },
    },
    prompt,
  ];
}
console.log("🟢 Sending prompt to Gemini:", input);

const result = await model.generateContent(input);
let reply = result.response.text();

if (translate === "hindi") {
  const translateModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const translation = await translateModel.generateContent(`Translate this into Hindi: ${reply}`);
  reply = translation.response.text();
}
console.log("🟢 Prompt:", prompt);
console.log("🟢 Gemini Reply:", reply);

    res.json({ success: true, reply });
  } catch (error) {
  console.error("❌ AI Chat Error:", error);
  if (error.response) {
    console.error("🔴 Response Status:", error.response.status);
    console.error("🔴 Response Data:", error.response.data);
  }
  res.status(500).json({
    success: false,
    message: "AI Assistant error: " + (error.message || "Unknown error"),
  });
}


});
// ------------------ GET ALL DISTRIBUTORS ------------------

app.get("/distributors", async (req, res) => {
  try {
    const distributors = await Distributor.find({}, "-password"); // Exclude passwords
    res.json({
      success: true,
      distributors
    });
  } catch (err) {
    console.error("Error fetching distributors:", err);
    res.status(500).json({ success: false, message: "Error fetching distributors" });
  }
});
// ===============================
// FULL CHECKOUT API (Distributor → Farmer)
// ===============================
app.post("/orders", async (req, res) => {
  try {
    const {
      distributorId,
      distributorName,
      distributorEmail,
      farmerId,
      productId,
      productName,
      unitPrice,
      quantity,
      totalPrice,
      address,
      paymentMethod
    } = req.body;

    // -------------------------------
    // 1️⃣ Validate Distributor
    // -------------------------------
    const distributor = await Distributor.findById(distributorId);
    if (!distributor) {
      return res.status(400).json({
        success: false,
        message: "Invalid Distributor ID"
      });
    }

    // -------------------------------
    // 2️⃣ Validate Product
    // -------------------------------
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(400).json({
        success: false,
        message: "Product not found"
      });
    }

    // -------------------------------
    // 3️⃣ Validate Farmer
    // -------------------------------
    if (!farmerId || !product.farmerId || product.farmerId.toString() !== farmerId) {
      return res.status(400).json({
        success: false,
        message: "Farmer not found for this product"
      });
    }

    // -------------------------------
    // 4️⃣ Price Calculation Safety
    // -------------------------------
    const finalUnitPrice = unitPrice || product.price;
    const finalTotalPrice = quantity * finalUnitPrice;

    // -------------------------------
    // 5️⃣ Create Order
    // -------------------------------
    const order = new Order({
      productId,
      productName,
      farmerId,
      distributorId,
      distributorName,
      distributorEmail,
      unitPrice: finalUnitPrice,
      quantity,
      totalPrice: finalTotalPrice,
      address,
      paymentMethod,
      orderDate: new Date()
    });

    await order.save();

    res.json({
      success: true,
      message: "Order placed successfully!",
      order
    });

  } catch (err) {
    console.error("🔥 Checkout Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while placing order"
    });
  }
});
app.delete("/distributor/deleteStock/:orderId", async (req, res) => {
  try {
    console.log("Delete request received for ID:", req.params.orderId);
    const deleted = await Order.findByIdAndDelete(req.params.orderId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Stock not found" });
    }

    res.json({ success: true, message: "Stock deleted successfully" });
  } catch (err) {
    console.error("Delete Stock Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// Example: GET /farmer/getProductType?farmerId=123
app.get("/farmer/getProductType", async (req, res) => {
  try {
    const { farmerId } = req.query;

    if (!farmerId) {
      return res.status(400).json({ success: false, message: "Farmer ID is required" });
    }

    // Find all products for the farmer and get unique categories
    const products = await Product.find({ farmerId });

    if (!products || products.length === 0) {
      return res.status(404).json({ success: false, message: "No products found for this farmer" });
    }

    // Extract unique categories
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

    res.json({
      success: true,
      categories
    });

  } catch (error) {
    console.error("Error fetching product type:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
});


app.get("/distributor/ordersToFarmer/:distributorId", async (req, res) => {
  try {
    const orders = await Order.find({ distributorId: req.params.distributorId })
      .populate("farmerId", "name farmName location")
      .populate("productId", "name price image");

    res.json({ success: true, orders });
  } catch (err) {
    console.error("Fetch Distributor → Farmer Orders Error:", err);
    res.status(500).json({ success: false, message: "Error fetching orders" });
  }
});


app.put("/distributor/updateStock/:stockId", async (req, res) => {
  try {
    const { name, price, quantity, category, image } = req.body;

    // Find stock by ID and update
    const updatedStock = await DistributorStock.findByIdAndUpdate(
      req.params.stockId,
      {
        name,
        price,
        quantity,
        category,
        image
      },
      { new: true } // return updated document
    );

    if (!updatedStock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }

    res.json({
      success: true,
      message: "Stock updated successfully",
      stock: updatedStock,
    });

  } catch (err) {
    console.error("Update Stock Error:", err);
    res.status(500).json({
      success: false,
      message: "Error updating stock",
    });
  }
});
app.post("/distributor/addMarketplaceProduct", upload.single("image"), async (req, res) => {
  try {
    const distributorId = req.headers["distributorid"];
    if (!distributorId) {
      return res.status(400).json({ success: false, message: "Distributor ID missing!" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image upload failed!" });
    }
    
    let imageUrl = null;
    let ipfsHash = null;
    
    // Upload image to IPFS if file exists
    try {
      const uploadResult = await handleFileUpload(req.file, {
        productName: req.body.productName || 'Untitled Product',
        distributorId,
        type: 'distributor_marketplace',
        timestamp: new Date().toISOString()
      });
      
      if (uploadResult.success) {
        ipfsHash = uploadResult.ipfsHash;
        imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
        
        // Clean up the temporary file
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting temporary file:', err);
        });
      } else {
        console.error('IPFS upload failed:', uploadResult.error);
        // Fallback to local file path
        let fallbackUrl = `/uploads/${req.file.filename}`;
        if (!isValidImagePath(fallbackUrl)) {
          return res.status(400).json({ success: false, message: "Invalid file path. Please re-upload the image." });
        }
        imageUrl = fallbackUrl;
      }
    } catch (uploadError) {
      console.error('Error uploading to IPFS:', uploadError);
      // Fallback to local file path if IPFS upload fails
      let fallbackUrl = `/uploads/${req.file.filename}`;
      if (!isValidImagePath(fallbackUrl)) {
        return res.status(400).json({ success: false, message: "Invalid file path. Please re-upload the image." });
      }
      imageUrl = fallbackUrl;
    }
    console.log("BODY RECEIVED:", req.body);


    const {
      productType,
      boughtDate,
      distributorPurchaseDate,
      storedDays,
      coldStorage,
      temperature,
      // Dynamic fields for grains
      isCleaned,
      grade,
      impurityPercentage,
      packSize,
      packMaterial,
      moisturePercentage,
      // Dynamic fields for fruits
      ripenessLevel,
      coldStorageUsed,
      coldStorageDuration,
      storageTemperature,
      fruitSize,
      colorGrade,
      damagePercentage,
      // Dynamic fields for vegetables
      freshnessScore,
      isWashed,
      preservationMethod,
      preservationDuration,
      // Common fields
      initialWeight,
      finalWeight,
      distributorMargin,
      batchId,
      processingStatus,
      packagedAt,
      distributorName,
      productName,
      marketPrice
    } = req.body;

    // Check if product already exists
    const existing = await MarketplaceProduct.findOne({ distributorId, productName });
    if (existing) {
      return res.status(400).json({ success: false, message: "You have already added this product to the marketplace!" });
    }

    const newProduct = new MarketplaceProduct({
      distributorId,
      distributorName: req.body.distributorName || 'Unknown Distributor',
      productName: req.body.productName || 'Unnamed Product',
      ipfsHash: ipfsHash || undefined,
      productType,
      distributorPurchaseDate,
      boughtDate,
      storedDays,
      coldStorage,
      temperature,
      isCleaned,
      grade,
      impurityPercentage,
      packSize,
      packMaterial,
      moisturePercentage,
      ripenessLevel,
      coldStorageUsed,
      coldStorageDuration,
      storageTemperature,
      fruitSize,
      colorGrade,
      damagePercentage,
      freshnessScore,
      isWashed,
      preservationMethod,
      preservationDuration,
      initialWeight,
      finalWeight,
      distributorMargin,
      batchId,
      processingStatus,
      packagedAt,
      marketPrice,
      image: imageUrl,
      ipfsHash: ipfsHash || undefined
    });

    await newProduct.save();
    
    console.log("✅ Distributor product added with IPFS:", {
      productName: newProduct.productName,
      ipfsHash,
      imageUrl: newProduct.image
    });
    
    res.status(201).json({ 
      success: true, 
      message: "Product added to marketplace!", 
      product: {
        ...newProduct.toObject(),
        ipfsHash
      } 
    });

  } catch (error) {
    console.error("Error adding marketplace product:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
});

app.post('/distributor/checkMarketplace', async (req, res) => {
  const { distributorId, productId } = req.body;

  try {
    const exists = await MarketplaceProduct.findOne({ distributorId, productId });
    res.json({ exists: !!exists });
  } catch (err) {
    console.error(err);
    res.json({ exists: false });
  }
});
// Get all orders made by distributors for a specific farmer
app.get("/farmer/distributor-orders/:farmerId", async (req, res) => {
  try {
    const orders = await DistributorOrder.find({
      farmerId: req.params.farmerId,
      customerType: "distributor"
    }).populate("distributorId", "name email shopName");

    res.json({ success: true, orders });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Error fetching distributor orders" });
  }
});
app.get("/marketplace/all", async (req, res) => {
  try {
    const products = await MarketplaceProduct.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      products
    });

  } catch (err) {
    console.error("Error fetching marketplace products:", err);
    res.json({ success: false, message: "Server Error" });
  }
});
app.get("/distributor/:id/qr", async (req, res) => {
  try {
    const distributor = await Distributor.findById(req.params.id);

    if (!distributor || !distributor.qrCode) {
      return res.json({ success: false, message: "QR not found" });
    }

    return res.json({
      success: true,
      qrUrl: "/uploads/qrCodes/" + distributor.qrCode,
    });

  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Server error" });
  }
});
app.post("/retailer/order", async (req, res) => {
  try {
    console.log("Retailer placing order:", req.body);

    const order = new RetailerOrder({
      productId: req.body.productId,
      productName: req.body.productName,
      unitPrice: req.body.unitPrice,
      quantity: req.body.quantity,
      totalPrice: req.body.totalPrice,

      retailerId: req.body.retailerId,
      retailerName: req.body.retailerName,
      retailerEmail: req.body.retailerEmail,

      distributorId: req.body.distributorId,

      paymentMethod: req.body.paymentMethod,
      address: req.body.address
    });

    await order.save();

    res.json({ success: true, message: "Order placed successfully" });

  } catch (err) {
    console.error("Error placing retailer order:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/retailer/orders/:retailerId", async (req, res) => {
  try {
    const retailerId = req.params.retailerId;

    const orders = await RetailerOrder.find({ retailerId })
      .populate("distributorId", "companyName");

    res.json({
      success: true,
      orders: orders.map(order => ({
        _id: order._id,
        productName: order.productName,
        quantity: order.quantity,
        totalPrice: order.totalPrice,
        price: order.unitPrice,
        distributorId: order.distributorId,
        retailerName: order.retailerName,
        paymentMethod: order.paymentMethod,
        address: order.address,
        date: order.orderDate,
        status: order.status,
        productId: order.productId  // <-- ADD THIS
      }))
    });

  } catch (error) {
    console.error("Error fetching retailer orders:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching orders"
    });
  }
});

// DELETE RETAILER ORDER
app.delete("/retailer/orders/:orderId", async (req, res) => {
    try {
        const deleted = await RetailerOrder.findByIdAndDelete(req.params.orderId);

        if (!deleted) {
            return res.json({ success: false, message: "Order not found" });
        }

        res.json({ success: true, message: "Order deleted successfully" });

    } catch (err) {
        console.error("Delete order error:", err);
        res.status(500).json({ success: false, message: "Error deleting order" });
    }
});

app.post("/retailer/add-marketplace", upload.single("image"), async (req, res) => {
    try {
        let { retailerId, orderId, productName, buyingPrice, sellingPrice, quantity, description } = req.body;

        // Validate required fields
        if (!retailerId || !orderId || !productName ||
            buyingPrice == null || sellingPrice == null || quantity == null) {
            return res.json({ success: false, message: "Missing required fields" });
        }

        buyingPrice = Number(buyingPrice);
        sellingPrice = Number(sellingPrice);
        quantity = Number(quantity);

        // Check if the product is already in marketplace
        const existing = await RetailerProducts.findOne({ retailerId, orderId });
        if (existing) {
            return res.json({ success: false, message: "You have already added this product to the marketplace." });
        }

        let imageUrl = null;
        let ipfsHash = null;

        // Upload to IPFS if file exists
        if (req.file) {
            try {
                const uploadResult = await handleFileUpload(req.file, {
                    productName,
                    retailerId,
                    type: 'retailer_marketplace',
                    timestamp: new Date().toISOString()
                });
                
                if (uploadResult.success) {
                    ipfsHash = uploadResult.ipfsHash;
                    imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
                    
                    // Clean up the temporary file
                    fs.unlink(req.file.path, (err) => {
                        if (err) console.error('Error deleting temporary file:', err);
                    });
                } else {
                    console.error('IPFS upload failed:', uploadResult.error);
                    // Continue with local file path as fallback
                    let fallbackUrl = `/uploads/${req.file.filename}`;
                    if (!isValidImagePath(fallbackUrl)) {
                        return res.json({ success: false, message: "Invalid file format. Please re-upload the image." });
                    }
                    imageUrl = fallbackUrl;
                }
            } catch (uploadError) {
                console.error('Error uploading to IPFS:', uploadError);
                // Fallback to local file path if IPFS upload fails
                if (req.file) {
                    let fallbackUrl = `/uploads/${req.file.filename}`;
                    if (!isValidImagePath(fallbackUrl)) {
                        return res.json({ success: false, message: "Invalid file format. Please re-upload the image." });
                    }
                    imageUrl = fallbackUrl;
                }
            }
        }

        const retailerProduct = new RetailerProducts({
            retailerId,
            orderId,
            productId: new mongoose.Types.ObjectId(),
            productName,
            buyingPrice,
            sellingPrice,
            quantity,
            description,
            image: imageUrl,
            ipfsHash: ipfsHash || undefined
        });

        await retailerProduct.save();

        res.json({ 
            success: true, 
            message: "Product added successfully",
            imageUrl,
            ipfsHash
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
});
// 🔹 GET all retailer products for consumer marketplace
app.get("/api/consumer/retailer-products", async (req, res) => {
  try {
    const products = await RetailerProducts.find({})
      .select("productName description sellingPrice image retailerId createdAt") // select only needed fields
      .lean();

    if (!products || products.length === 0) {
      return res.json({ success: true, products: [] });
    }

    const formattedProducts = products.map(p => ({
      id: p._id,
      productName: p.productName,
      description: p.description,
      price: p.sellingPrice,
      image: p.image
        ? (p.image.startsWith("http://") || p.image.startsWith("https://")
            ? p.image
            : (p.image.startsWith("/") ? `http://localhost:5000${p.image}` : `http://localhost:5000/uploads/${p.image}`))
        : "https://via.placeholder.com/400x200?text=No+Image",
      retailer: p.retailerId,      // optionally populate name from Retailer collection
      createdAt: p.createdAt
    }));

    res.json({ success: true, products: formattedProducts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
app.delete("/farmer/notification/delete/:id", async (req, res) => {
  try {
    await FarmerNotification.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Notification deleted" });

  } catch (err) {
    res.json({ success: false, message: "Error deleting notification" });
  }
});

app.post("/farmer/notification/accept/:id", async (req, res) => {
  try {
    const notification = await FarmerNotification.findByIdAndUpdate(
      req.params.id,
      { status: "accepted" },
      { new: true }
    );

    res.json({ success: true, message: "Notification accepted", notification });

  } catch (err) {
    res.json({ success: false, message: "Error accepting notification" });
  }
});


// ------------------ START SERVER ------------------
app.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));
