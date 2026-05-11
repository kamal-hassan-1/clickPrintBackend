const mongoose = require('mongoose');

const Shop = require('./Shop');
const User = require('./User');

const settingsSchema = new mongoose.Schema({
  color: { type: Boolean, required: true },
  pageType: { type: String, required: true },
  orientation: { type: String, required: true },
  pagesPerSheet: { type: Number, required: true },
  numberOfCopies: { type: Number, required: true },
  pageSelection: { type: String, required: true },
  sidedness: { type: String, required: true },
}, { _id: false, versionKey: false, timestamps: false });

module.exports = mongoose.model('Job', new mongoose.Schema({
  createdAt: { type: Date, required: true, default: Date.now() },
  
  status: { type: String, required: true },
  forShop: { ref: Shop, required: true, type: mongoose.Schema.Types.ObjectId },
  createdBy: { ref: User, required: true, type: mongoose.Schema.Types.ObjectId },

  files: { required: true, validate: v => Array.isArray(v) && v.length > 0, type: [
    new mongoose.Schema({
      hash: { type: String, required: true },
      settings: { type: settingsSchema, required: true }
    }, { _id: false, versionKey: false, timestamps: false })
  ]}
}, { versionKey: false, timestamps: false }));