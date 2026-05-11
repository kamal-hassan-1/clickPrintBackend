const mongoose = require('mongoose');

module.exports = mongoose.model('Otp', new mongoose.Schema({

  code: { type: String, required: true },
  tries: { type: Number, required: true },
  expiry: { type: Date, required: true, index: { expires: 0 }},
  number: { type: String, required: true, unique: true, index: true },

}, { versionKey: false, timestamps: false }));