const mongoose = require('mongoose');

// TODO: add validations

const topupSchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'declined'],
  },
  amount: {
    type: Number,
    required: true,
    validate: (v) => Number.isInteger(v) && v >= 10 && v % 10 === 0,
  },
  ppfid: {
    ref: 'File',
    required: true,
    type: mongoose.Schema.Types.ObjectId,
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now(),
  },
  createdBy: {
    ref: 'User',
    required: true,
    type: mongoose.Schema.Types.ObjectId,
  },
}, {
  timestamps: false,
  versionKey: false,
});

const Topup = mongoose.model('Topup', topupSchema);

Topup.filePopulate = [
  { path: 'ppfid', select: 'originalName' },
  { path: 'createdBy', select: 'name number' },
];

module.exports = Topup;