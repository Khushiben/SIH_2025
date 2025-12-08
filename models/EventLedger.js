import mongoose from 'mongoose';

const eventLedgerSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product',
    required: true,
    index: true
  },
  eventName: {
    type: String,
    required: true,
    enum: [
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
  actorRole: {
    type: String,
    required: true,
    enum: ['farmer', 'distributor', 'retailer']
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'actorRole'
  },
  eventData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipfsCIDs: [{
    type: String
  }],
  timestamp: {
    type: Date,
    default: Date.now
  },
  previousHash: {
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

const EventLedger = mongoose.model('EventLedger', eventLedgerSchema);

export default EventLedger;
