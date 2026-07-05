const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true,
  },
  numberOfPages: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now(),
  },
  uploadedBy: {
    ref: 'User',
    required: true,
    type: mongoose.Schema.Types.ObjectId
  },
}, {
  timestamps: false,
  versionKey: false,
});

module.exports = mongoose.model('File', fileSchema);