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

printerSchema.index({ shop: 1, name: 1 }, { unique: true });

const Printer = mongoose.model('Printer', printerSchema);

Printer.printerPopulate = [
  { path: 'shop', select: 'name' },
];

module.exports = Printer;