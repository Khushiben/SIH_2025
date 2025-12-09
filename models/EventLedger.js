import mongoose from 'mongoose';

const eventLedgerSchema = new mongoose.Schema({
  productId: { 
    type: String, // Changed to String to support batchId (can be ObjectId or string batchId)
    required: true,
    index: true
  },
  eventName: {
    type: String,
    required: true,
    enum: [
      'SOWING',
      'TILLERING',
      'FLOWERING',
      'GRAIN_FILLING',
      'HARVEST',
      'PRODUCT_CREATED',
      'SENT_TO_DISTRIBUTOR',
      'DISTRIBUTOR_ACCEPTED',
      'CHECKOUT_INITIATED_BY_DISTRIBUTOR',
      'PRODUCT_UPGRADED_BY_DISTRIBUTOR',
      'PRODUCT_LISTED_IN_DISTRIBUTOR_MARKETPLACE',
      'RETAILER_REQUESTED_TO_BUY',
      'DISTRIBUTOR_LOGISTICS_ADDED',
      'RETAILER_CHECKOUT_INITIATED',
      'RETAILER_ACCEPTED_DELIVERY',
      'CERTIFICATE_GENERATED',
      'QR_GENERATED'
    ]
  },
  role: {
    type: String,
    required: true,
    enum: ['farmer', 'distributor', 'retailer']
  },
  eventData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipfsCids: [{
    type: String
  }],
  timestamp: {
    type: Date,
    default: Date.now
  },
  prevHash: {
    type: String,
    default: null
  },
  currentHash: {
    type: String,
    required: true
  },
  txHash: {
    type: String,
    default: null
  },
  contractAddress: {
    type: String,
    default: null
  }
}, { timestamps: true });

// Create compound index for faster lookups
eventLedgerSchema.index({ productId: 1, timestamp: 1 });
eventLedgerSchema.index({ productId: 1, eventName: 1 });

const EventLedger = mongoose.model('EventLedger', eventLedgerSchema);

export default EventLedger;
