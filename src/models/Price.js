const mongoose = require('mongoose');

// TODO: add validations

const priceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  rate: {
    type: Number,
    required: true,
  },
  keys: { 
    required: true,
    type: mongoose.Schema.Types.Mixed,
  },
  shop: {
    ref: 'Shop',
    required: true,
    type: mongoose.Schema.Types.ObjectId,
  },
}, {
  timestamps: false,
  versionKey: false,
});

const Price = mongoose.model('Price', priceSchema);

module.exports = Price;