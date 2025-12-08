import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the project root
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const PINATA_JWT = process.env.PINATA_JWT || '';
const PINATA_API_URL = 'https://api.pinata.cloud';

console.log('Pinata Configuration:', {
  hasJWT: !!PINATA_JWT,
  jwtStartsWith: PINATA_JWT ? PINATA_JWT.substring(0, 10) + '...' : 'N/A',
  envPath
});

if (!PINATA_JWT) {
  console.warn('⚠️  PINATA_JWT is not set in environment variables. IPFS uploads will fail.');
  console.warn('   Please ensure your .env file is in the project root and contains PINATA_JWT');
}

const pinataHeaders = {
  'Authorization': `Bearer ${PINATA_JWT}`,
  'Content-Type': 'application/json'
};

export const uploadFileToPinata = async (filePath, metadata = {}) => {
  try {
    const formData = new FormData();
    
    // Add file to form data
    formData.append('file', fs.createReadStream(filePath));
    
    // Add metadata if provided
    if (Object.keys(metadata).length > 0) {
      formData.append('pinataMetadata', JSON.stringify({
        name: path.basename(filePath),
        keyvalues: metadata
      }));
    }

    const response = await axios.post(
      `${PINATA_API_URL}/pinning/pinFileToIPFS`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${PINATA_JWT}`
        },
        maxBodyLength: 'Infinity'
      }
    );

    return {
      success: true,
      ipfsHash: response.data.IpfsHash,
      pinSize: response.data.PinSize,
      timestamp: response.data.Timestamp,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`
    };
  } catch (error) {
    console.error('Error uploading file to Pinata:', error.response?.data || error.message);
    throw new Error(`Failed to upload file to IPFS: ${error.message}`);
  }
};

export const uploadJSONToPinata = async (jsonObject, metadata = {}) => {
  try {
    const data = {
      pinataContent: jsonObject,
      pinataMetadata: {
        name: metadata.name || 'data.json',
        keyvalues: metadata.keyvalues || {}
      }
    };

    const response = await axios.post(
      `${PINATA_API_URL}/pinning/pinJSONToIPFS`,
      data,
      { headers: pinataHeaders }
    );

    return {
      success: true,
      ipfsHash: response.data.IpfsHash,
      pinSize: response.data.PinSize,
      timestamp: response.data.Timestamp,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`
    };
  } catch (error) {
    console.error('Error uploading JSON to Pinata:', error.response?.data || error.message);
    throw new Error(`Failed to upload JSON to IPFS: ${error.message}`);
  }
};

// Helper function to check if a file is an image
export const isImageFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return file && file.mimetype && allowedTypes.includes(file.mimetype);
};

// Helper function to handle file upload from multer file object
export const handleFileUpload = async (file, metadata = {}) => {
  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  try {
    if (!PINATA_JWT) {
      console.warn('PINATA_JWT not set. Using local file path.');
      return { 
        success: true, 
        localPath: file.path,
        fileName: file.filename,
        fileUrl: `/uploads/${file.filename}`
      };
    }

    // Create form data
    const formData = new FormData();
    
    // Add file to form data
    const fileStream = fs.createReadStream(file.path);
    formData.append('file', fileStream, {
      filename: file.originalname || file.filename || 'file',
      contentType: file.mimetype || 'application/octet-stream'
    });
    
    // Add metadata if provided
    if (Object.keys(metadata).length > 0) {
      formData.append('pinataMetadata', JSON.stringify({
        name: file.originalname || file.filename || 'file',
        keyvalues: metadata
      }));
    }
    
    // Add pinata options
    formData.append('pinataOptions', JSON.stringify({
      cidVersion: 0
    }));

    // Make the request to Pinata
    const response = await axios.post(
      `${PINATA_API_URL}/pinning/pinFileToIPFS`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${PINATA_JWT}`,
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`
        },
        maxBodyLength: 'Infinity',
        maxContentLength: Infinity,
      }
    );

    // Clean up the temporary file
    try {
      await fs.promises.unlink(file.path);
    } catch (cleanupError) {
      console.error('Error cleaning up temporary file:', cleanupError);
    }

    return {
      success: true,
      ipfsHash: response.data.IpfsHash,
      pinSize: response.data.PinSize,
      timestamp: response.data.Timestamp,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`,
      fileUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`
    };
  } catch (error) {
    console.error('Error in handleFileUpload:', {
      error: error.message,
      response: error.response?.data,
      stack: error.stack
    });
    
    // Fallback to local file if IPFS upload fails
    return {
      success: false,
      error: error.message,
      localPath: file.path,
      fileName: file.filename,
      fileUrl: `/uploads/${file.filename}`,
      fallback: true
    };
  }
};

export default {
  uploadFileToPinata,
  uploadJSONToPinata,
  isImageFile,
  handleFileUpload
};
