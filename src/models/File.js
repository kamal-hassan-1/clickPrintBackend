const crypto = require('crypto');
const mongoose = require('mongoose');

// TODO: add validations

const fileSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    default: () => crypto.randomUUID(),
  },

  originalName: {
    type: String,
    required: true,
  },
  numberOfPages: {
    type: Number,
    required: function () { return !this.raw; },
  },
  raw: {
    type: Boolean,
    required: true,
    default: false,
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

const File = mongoose.model('File', fileSchema);

File.filePopulate = [
  { path: 'uploadedBy', select: 'name number' },
];

module.exports = File;