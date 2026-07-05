const mongoose = require('mongoose');

// TODO: add validations

const otpSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
  },
  tries: {
    type: Number,
    required: true,
  },
  lastSentAt: {
    type: Date,
    required: true,
  },
  expiry: {
    type: Date,
    required: true,
    index: { expires: 0 },
  },
  number: {
    index: true,
    unique: true,
    type: String,
    required: true,
  },
}, {
  timestamps: false,
  versionKey: false,
});

const Otp = mongoose.model('Otp', otpSchema);

module.exports = Otp;