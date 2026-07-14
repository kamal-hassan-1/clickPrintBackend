const mongoose = require('mongoose');

// TODO: add validations

const shopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  coordinates: {
    required: true,
    type: [ Number ],
  },
  capabilities: {
    required: true,
    type: [ String ],
  },
  isDisabled: {
    type: Boolean,
    required: true,
    default: true,
  },
  isOnline: {
    type: Boolean,
    required: true,
    default: false,
  },
  lastSeen: {
    type: Date,
    required: true,
    default: new Date(0),
  },
  owner: {
    ref: 'User',
    unique: true,
    required: true,
    type: mongoose.Schema.Types.ObjectId,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  timings: {
    required: true,
    type: [ String ],
  },
  walletNumber: {
    type: String,
    required: true,
  }
}, {
  timestamps: false,
  versionKey: false,
});

const Shop = mongoose.model('Shop', shopSchema);

module.exports = Shop;