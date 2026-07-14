const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  user: {
    ref: 'User',
    unique: true,
    required: true,
    type: mongoose.Schema.Types.ObjectId,
  },
}, {
  timestamps: false,
  versionKey: false,
});

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
