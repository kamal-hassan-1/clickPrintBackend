const mongoose = require('mongoose');

module.exports = mongoose.model('User', new mongoose.Schema({

  name: {
    default: '',
    type: String,
  },
  balance: {
    default: 0,
    type: Number,
  },
  number: {
    type: String,
    unique: true,
    index: true,
    required: true,
  },

}, { versionKey: false, timestamps: false }));