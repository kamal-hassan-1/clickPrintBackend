const mongoose = require('mongoose');
const User = require('./User');

module.exports = mongoose.model('File', new mongoose.Schema({

  originalName: { type: String, required: true },
  numberOfPages: { type: Number, required: true },
  createdAt: { type: Date, required: true, default: Date.now() },
  fileId: { type: String, required: true, unique: true, index: true },
  uploadedBy: { ref: User, required: true, type: mongoose.Schema.Types.ObjectId },

}, { versionKey: false, timestamps: false }));