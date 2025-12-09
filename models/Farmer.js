import mongoose from 'mongoose';

const farmerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: String
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  farmDetails: {
    farmName: String,
    farmSize: Number, // in acres
    farmAddress: String,
    crops: [String]
  },
  documents: [{
    documentType: String,
    documentUrl: String,
    verified: {
      type: Boolean,
      default: false
    }
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  walletAddress: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
farmerSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create 2dsphere index for geospatial queries
farmerSchema.index({ location: '2dsphere' });

const Farmer = mongoose.model('Farmer', farmerSchema);

export default Farmer;
