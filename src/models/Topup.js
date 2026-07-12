const mongoose = require('mongoose');

// TODO: add validations

const topupSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    validate: (v) => Number.isInteger(v) && v >= 10 && v % 10 === 0,
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now(),
  },
  createdBy: {
    ref: 'User',
    required: true,
    type: mongoose.Schema.Types.ObjectId
  },
  shop: {
    ref: 'Shop',
    required: true,
    type: mongoose.Schema.Types.ObjectId,
  },
  paymentProofScreenshotFileId: {
    ref: 'File',
    required: false,
    type: mongoose.Schema.Types.ObjectId,
  } 
}, {
  timestamps: false,
  versionKey: false,
});

const Topup = mongoose.model('Topup', topupSchema);

Topup.filePopulate = [
  { path: 'shop', select: 'name' },
  { path: 'createdBy', select: 'name number' },
  { path: 'paymentProofScreenshotFileId', select: 'originalName' },
];

module.exports = Topup;