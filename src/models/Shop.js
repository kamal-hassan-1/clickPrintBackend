const mongoose = require('mongoose');

module.exports = mongoose.model('Shop', new mongoose.Schema({

  name: { type: String, required: true },
  address: { type: String, required: true },
  capabilities: { type: [String], required: true },

}, { versionKey: false, timestamps: false }));