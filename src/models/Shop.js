const mongoose = require('mongoose');

module.exports = mongoose.model('Shop', new mongoose.Schema({

  name: { type: String, required: true },
  address: { type: String, required: true },
  capabilities: { type: [String], required: true },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },

}, { versionKey: false, timestamps: false }));