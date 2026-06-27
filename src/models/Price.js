const mongoose = require('mongoose');

const priceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    rate: { type: Number, required: true },
    keys: { type: mongoose.Schema.Types.Mixed, required: true },
    shop: { ref: 'Shop', required: true, type: mongoose.Schema.Types.ObjectId },
}, {
    versionKey: false, timestamps: false
});

module.exports = mongoose.model('Price', priceSchema);