const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },

  capabilities: { type: [String], required: true },
  
  owner: {
    ref: 'User',
    type: mongoose.Schema.Types.ObjectId,
    required: true, unique: true, index: true,
  },

  lastSeen: { type: Date, required: true, default: new Date(0) },
  isOnline: { type: Boolean, required: true, default: false },
  isDisabled: { type: Boolean, required: true, default: false },
}, {
  versionKey: false, timestamps: false
});

module.exports = mongoose.model('Shop', shopSchema);