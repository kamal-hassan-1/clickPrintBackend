const mongoose = require('mongoose');

// TODO: add validations

const userSchema = new mongoose.Schema({
  name: {
    default: '',
    type: String,
  },
  balance: {
    default: 0,
    type: Number,
    required: true,
  },
  number: {
    index: true,
    unique: true,
    type: String,
    required: true,
  },
}, {
  timestamps: false,
  versionKey: false,
});

const User = mongoose.model('User', userSchema);

module.exports = User;