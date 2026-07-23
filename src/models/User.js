const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({

  name: {
    type: String,
    default: '',
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
    match: [/^[\p{L}\p{N}\s.,'&()\-]*$/u, 'Name contains invalid characters'],
  },

  number: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    set: (v) => (typeof v === 'string' ? v.replace(/[\s\-()+]/g, '') : v),
    match: [/^923\d{9}$/, 'Phone number must be in 92XXXXXXXXXX format (e.g. 923001234567)'],
  },

  isDisabled: {
    type: Boolean,
    required: true,
    default: false,
  },

  balance: {
    type: Number,
    required: true,
    default: 0,
  }

}, { timestamps: false, versionKey: false, });

const User = mongoose.model('User', userSchema);

module.exports = User;