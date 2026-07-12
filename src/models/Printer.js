const mongoose = require('mongoose');

const printerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  lastSeen: {
    type: Date,
    required: true,
    default: new Date(0),
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

const Printer = mongoose.model('Printer', printerSchema);

module.exports = Printer;