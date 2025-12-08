import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['fruits', 'vegetables', 'grains', 'others']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  location: {
    type: String,
    required: true
  },
  harvestDate: {
    type: Date,
    required: true
  },
  moisture: {
    type: Number,
    required: true
  },
  protein: {
    type: Number,
    required: true
  },
  pesticide: {
    type: Number,
    required: true
  },
  ph: {
    type: Number,
    required: true
  },
  image: {
    type: String,
    default: ''
  },
  labReport: {
    type: String,
    default: ''
  },
  preferences: [{
    type: String,
    enum: ['all', 'jain', 'swaminarayan', 'vegan', 'organic', 'fruitarian', 'gluten-free']
  }],
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    required: true
  },
  distributorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Distributor'
  },
  retailerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Retailer'
  },
  status: {
    type: String,
    enum: ['available', 'shipped', 'delivered', 'sold'],
    default: 'available'
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
productSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Product = mongoose.model('Product', productSchema);

export default Product;
