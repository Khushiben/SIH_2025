import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import axios from 'axios';
import { uploadFileToPinata } from '../services/pinataUpload.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agriDirect')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// Sample data
const SAMPLE_FARMER_ID = process.env.SAMPLE_FARMER_ID || '507f1f77bcf86cd799439011'; // Update with actual farmer ID
const BASE_URL = 'http://localhost:5000';

// Helper to create a dummy image file
async function createDummyImage(filename) {
  const imagePath = path.join(__dirname, '..', 'uploads', filename);
  const dir = path.dirname(imagePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Create a simple 1x1 PNG (minimal valid PNG)
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE,
    0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
    0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND
  ]);
  
  fs.writeFileSync(imagePath, pngBuffer);
  return imagePath;
}

// Helper to create a dummy PDF file
async function createDummyPDF(filename) {
  const pdfPath = path.join(__dirname, '..', 'uploads', filename);
  const dir = path.dirname(pdfPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Minimal valid PDF
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Sample PDF) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000206 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
300
%%EOF`;
  
  fs.writeFileSync(pdfPath, pdfContent);
  return pdfPath;
}

// Submit event to API
async function submitEvent(eventName, endpoint, data, files = {}) {
  const formData = new FormData();
  
  // Add form fields
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });
  
  // Add files
  for (const [fieldName, filePath] of Object.entries(files)) {
    if (filePath && fs.existsSync(filePath)) {
      formData.append(fieldName, fs.createReadStream(filePath));
    }
  }
  
  try {
    console.log(`\n📤 Submitting ${eventName}...`);
    const response = await axios.post(`${BASE_URL}/api/wheat/${endpoint}`, formData, {
      headers: formData.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    
    if (response.data.success) {
      console.log(`✅ ${eventName} recorded successfully`);
      console.log(`   Hash: ${response.data.block.currentHash.substring(0, 16)}...`);
      console.log(`   Tx: ${response.data.block.txHash ? response.data.block.txHash.substring(0, 16) + '...' : 'Pending'}`);
      return response.data;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    console.error(`❌ Error submitting ${eventName}:`, error.response?.data || error.message);
    throw error;
  }
}

// Main function
async function main() {
  console.log('🌾 Starting Wheat Lifecycle Sample Script\n');
  
  // Generate batch ID
  const batchId = `WHEAT-SAMPLE-${Date.now()}`;
  console.log(`📦 Batch ID: ${batchId}\n`);
  
  // Create sample files
  console.log('📁 Creating sample files...');
  const soilReportPath = await createDummyPDF('sample_soil_report.pdf');
  const imageFieldBefore = await createDummyImage('sample_field_before.png');
  const imageSeeds = await createDummyImage('sample_seeds.png');
  const imageGrowth = await createDummyImage('sample_growth.png');
  const imageFertilizer = await createDummyImage('sample_fertilizer.png');
  const imagePest = await createDummyImage('sample_pest.png');
  const imageAfterSpray = await createDummyImage('sample_after_spray.png');
  const pesticideBill = await createDummyPDF('sample_pesticide_bill.pdf');
  const imageRipening = await createDummyImage('sample_ripening.png');
  const labReport = await createDummyPDF('sample_lab_report.pdf');
  const organicCert = await createDummyPDF('sample_organic_cert.pdf');
  const imageHarvest = await createDummyImage('sample_harvest.png');
  const imageGrain = await createDummyImage('sample_grain.png');
  console.log('✅ Sample files created\n');
  
  try {
    // EVENT 1: Sowing
    await submitEvent('SOWING', 'event/sowing', {
      farmerId: SAMPLE_FARMER_ID,
      batchId,
      gpsLocation: '28.6139° N, 77.2090° E',
      sowingDate: new Date().toISOString().split('T')[0],
      seedType: 'Certified',
      seedVariety: 'HD-3086',
      seedSource: 'Government',
      soilType: 'Loamy',
      firstIrrigationDone: 'Yes',
      remarks: 'Sample sowing event'
    }, {
      soilReportFile: soilReportPath,
      imageFieldBeforeSowing: imageFieldBefore,
      imageSeedsUsed: imageSeeds
    });
    
    // EVENT 2: Tillering
    await submitEvent('TILLERING', 'event/tillering', {
      batchId,
      date: new Date().toISOString().split('T')[0],
      tillerCount: '3.5',
      irrigationGiven: 'Yes',
      waterAppliedLitres: '5000',
      fertilizerUsed: 'Yes',
      fertilizerType: 'Urea',
      fertilizerQuantity: '50',
      remarks: 'Sample tillering event'
    }, {
      imageFieldGrowth: imageGrowth,
      imageFertilizerUsed: imageFertilizer
    });
    
    // EVENT 3: Flowering
    await submitEvent('FLOWERING', 'event/flowering', {
      batchId,
      date: new Date().toISOString().split('T')[0],
      pestAttack: 'Yes',
      pestType: 'Aphids',
      pestSeverity: 'Low',
      pesticideUsed: 'Yes',
      pesticideType: 'Imidacloprid',
      pesticideQuantity: '10',
      irrigationGiven: 'Yes',
      remarks: 'Sample flowering event'
    }, {
      imagePestAttack: imagePest,
      imageAfterSpray: imageAfterSpray,
      pesticideBillFile: pesticideBill
    });
    
    // EVENT 4: Grain Filling
    await submitEvent('GRAIN_FILLING', 'event/grainfilling', {
      batchId,
      date: new Date().toISOString().split('T')[0],
      cropColor: 'Golden Yellow',
      moistureLevelPercent: '25.5',
      lastIrrigationGiven: 'Yes',
      weatherCondition: 'Clear',
      lodging: 'None',
      remarks: 'Sample grain filling event'
    }, {
      imageRipeningWheat: imageRipening
    });
    
    // EVENT 5: Harvest
    await submitEvent('HARVEST', 'event/harvest', {
      batchId,
      harvestDate: new Date().toISOString().split('T')[0],
      totalYieldKg: '5000',
      moisturePercentAtHarvest: '12.5',
      grainGrade: 'A',
      storageMethod: 'Warehouse',
      warehouseId: 'WH-001'
    }, {
      labReportFile: labReport,
      organicCertificationFile: organicCert,
      imageHarvestPhoto: imageHarvest,
      imageGrainCloseup: imageGrain
    });
    
    // Generate Certificate
    console.log('\n📜 Generating Certificate...');
    const certResponse = await axios.post(`${BASE_URL}/api/wheat/generateCertificate/${batchId}`);
    if (certResponse.data.success) {
      console.log(`✅ Certificate generated successfully`);
      console.log(`   CID: ${certResponse.data.certificateCID}`);
      console.log(`   Gateway: ${certResponse.data.gatewayUrl}`);
      console.log(`\n🔗 View certificate at:`);
      console.log(`   http://localhost:5000/wheat_certificate.html?cid=${certResponse.data.certificateCID}`);
      console.log(`   or`);
      console.log(`   http://localhost:5000/wheat_certificate.html?batchId=${batchId}`);
    }
    
    console.log('\n✅ Lifecycle sample completed successfully!');
    console.log(`\n📋 Summary:`);
    console.log(`   Batch ID: ${batchId}`);
    console.log(`   Certificate CID: ${certResponse.data.certificateCID}`);
    
  } catch (error) {
    console.error('\n❌ Error in lifecycle sample:', error.message);
    process.exit(1);
  } finally {
    // Cleanup sample files
    const filesToDelete = [
      soilReportPath, imageFieldBefore, imageSeeds, imageGrowth,
      imageFertilizer, imagePest, imageAfterSpray, pesticideBill,
      imageRipening, labReport, organicCert, imageHarvest, imageGrain
    ];
    
    filesToDelete.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
    
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();

