const mongoose = require('mongoose');

// TODO: add validations

const keysSchema = new mongoose.Schema({
  colored: {
    type: Boolean,
    required: true,
  },
  pageType: {
    type: String,
    required: true,
  },
  sidedness: {
    type: Boolean,
    required: true,
  },
}, {
  _id: false,
  timestamps: false,
  versionKey: false,
});

const servicePrinterSchema = new mongoose.Schema({
  useAuto: {
    type: Boolean,
    required: true,
    default: false,
  },
  printer: {
    ref: 'Printer',
    required: true,
    type: mongoose.Schema.Types.ObjectId,
  },
}, {
  _id: false,
  timestamps: false,
  versionKey: false,
});

const serviceSchema = new mongoose.Schema({
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
    type: keysSchema,
  },
  shop: {
    ref: 'Shop',
    required: true,
    type: mongoose.Schema.Types.ObjectId,
  },
  printers: {
    required: true,
    type: [servicePrinterSchema],
  },
}, {
  timestamps: false,
  versionKey: false,
});

serviceSchema.index({ shop: 1, name: 1 }, { unique: true });
serviceSchema.index({ shop: 1, 'keys.colored': 1, 'keys.pageType': 1, 'keys.sidedness': 1 }, { unique: true });

const Service = mongoose.model('Service', serviceSchema);

Service.servicePopulate = [
  { path: 'shop', select: 'name' },
  { path: 'printers.printer', select: 'name' }
];

module.exports = Service;