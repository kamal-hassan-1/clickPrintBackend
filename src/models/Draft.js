const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  color: { type: Boolean, required: true },
  pageType: { type: String, required: true },
  sidedness: { type: String, required: true },
  orientation: { type: String, required: true },
  pageSelection: { type: String, required: true },
  pagesPerSheet: { type: Number, required: true },
  numberOfCopies: { type: Number, required: true },
}, {
  _id: false, versionKey: false, timestamps: false,
});

const fileSchema = new mongoose.Schema({
  fileId: { type: String, required: true },
  settings: { type: settingsSchema, required: true },
}, {
  _id: false, versionKey: false, timestamps: false,
});

const costSchema = new mongoose.Schema({
  total: { type: Number, required: true },
  lines: { type: [[mongoose.Mixed]], default: [] },
  extra: { type: [[mongoose.Mixed]], default: [] },
}, {
  _id: false, versionKey: false, timestamps: false,
});

const draftSchema = new mongoose.Schema({
  cost: { type: costSchema, required: true },
  createdBy: { ref: 'User', required: true, type: mongoose.Schema.Types.ObjectId },

  forShop: { ref: 'Shop', required: true, type: mongoose.Schema.Types.ObjectId },
  files: { required: true, validate: v => Array.isArray(v) && v.length > 0, type: [ fileSchema ] },
}, {
  versionKey: false, timestamps: false,
});

const Draft = mongoose.model('Draft', draftSchema);
Draft.draftSchema = draftSchema;

module.exports = Draft;