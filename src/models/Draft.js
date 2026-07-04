const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  color: {
    type: Boolean,
    required: true,
  },
  pageType: {
    type: String,
    required: true,
  },
  pagesPerSheet: {
    type: Number,
    required: true,
    enum: [ 1, 2, 4, 8, 16 ],
  },
  orientation: {
    type: String,
    required: true,
    enum: [ 'portrait', 'landscape' ],
  },
  sidedness: {
    type: String,
    required: true,
    enum: [ 'none', 'long', 'short' ],
  },
  numberOfCopies: {
    type: Number,
    required: true,
    validate: v => Number.isInteger(v) && v >= 1,
  },
  pageSelection: {
    type: String,
    required: function () { return this.pageSelection !== ""; },
  },
}, {
  _id: false,
  timestamps: false,
  versionKey: false,
});

const docSchema = new mongoose.Schema({
  file: {
    ref: 'File',
    required: true,
    type: mongoose.Schema.Types.ObjectId,
  },
  settings: {
    required: false,
    type: settingsSchema,
  },
}, {
  _id: false,
  timestamps: false,
  versionKey: false,
});

const costSchema = new mongoose.Schema({
  total: {
    type: Number,
    required: true,
  },
  lines: {
    default: [],
    type: [[mongoose.Mixed]],
  },
  extra: {
    default: [],
    type: [[mongoose.Mixed]],
  },
}, {
  _id: false,
  timestamps: false,
  versionKey: false,
});

const draftSchema = new mongoose.Schema({
  docs: {
    required: false,
    type: [ docSchema ],
  },
  cost: {
    required: false,
    type: costSchema,
  },
  shop: {
    ref: 'Shop',
    required: false,
    type: mongoose.Schema.Types.ObjectId,
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

const Draft = mongoose.model('Draft', draftSchema);
Draft.draftSchema = draftSchema;

module.exports = Draft;