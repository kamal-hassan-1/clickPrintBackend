const express = require('express');
const router = express.Router();

const Shop = require('../models/Shop');
const Price = require('../models/Price');

const { resp, validateObjectIds } = require('../func/misc');

// -------------------------------------------------------------------------- //

router.get('/{:shopId}', validateObjectIds('shopId', { allowEmpty: true }), async (req, res) => {
    if (req.params.shopId) {
    const shop = await Shop.findById(req.params.shopId).lean();
    const prices = await Price.find({ shop: req.params.shopId }).sort({ rate: 1 });

    if (!shop) return resp(res, 404, 'not found');
    return resp(res, 200, 'fetched shop', { shop: {...shop, prices} });
  }

  return resp(res, 200, 'fetched shops', { shops: await Shop.find({ isDisabled: false }) });
});

router.put('/:shopId', validateObjectIds('shopId'), async (req, res) => {
  if (!req.token.sid) return resp(res, 403, 'Forbidden');
  if (req.token.sid !== req.params.shopId) return resp(res, 403, 'Forbidden');

  const { name, address, capabilities } = req.body || {};
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (address !== undefined) updates.address = address;
  if (capabilities !== undefined) updates.capabilities = capabilities;

  const shop = await Shop.findByIdAndUpdate(req.params.shopId, updates, { new: true, runValidators: true });
  if (!shop) return resp(res, 404, 'Shop not found');

  return resp(res, 200, 'Shop updated successfully', { shop });
});

router.post('/:shopId/prices', validateObjectIds('shopId'), async (req, res) => {
  const { name, rate, keys } = req.body || {};
  
  if (!name || !rate || !keys) return resp(res, 400, 'missing or invalid field(s) (name, rate, keys)');
  if (!req.token.sid || req.token.sid !== req.params.shopId) return resp(res, 403, 'forbidden');

  const price = await Price.create({
    name, rate, keys,
    shop: req.token.sid,
  });

  return resp(res, 201, 'created price', {price});
});

router.put('/:shopId/prices/:priceId', validateObjectIds('shopId', 'priceId'), async (req, res) => {
  if (!req.token.sid || req.token.sid !== req.params.shopId) return resp(res, 403, 'forbidden');

  const { name, rate, keys } = req.body || {};
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (rate !== undefined) updates.rate = rate;
  if (keys !== undefined) updates.keys = keys;

  const price = await Price.findOneAndUpdate(
    { _id: req.params.priceId, shop: req.params.shopId },
    updates,
    { new: true, runValidators: true },
  );

  if (!price) return resp(res, 404, 'not found');
  return resp(res, 200, 'updated price', {price});
});

router.delete('/:shopId/prices/:priceId', validateObjectIds('shopId', 'priceId'), async (req, res) => {
  if (!req.token.sid || req.token.sid !== req.params.shopId) return resp(res, 403, 'forbidden');

  const price = await Price.findOneAndDelete({ _id: req.params.priceId, shop: req.params.shopId });

  if (!price) return resp(res, 404, 'not found');
  return resp(res, 200, 'deleted price');
});

router.patch('/:shopId/isOnline', validateObjectIds('shopId'), async (req, res) => {
  if (!req.token.sid || req.token.sid !== req.params.shopId) return resp(res, 403, 'forbidden');

  const shop = await Shop.findByIdAndUpdate(
    req.params.shopId,
    { isOnline: true, lastSeen: new Date() },
    { new: true }
  );

  if (!shop) return resp(res, 404, 'not found');

  return resp(res, 200, 'isOnline updated', { shop });
});

// -------------------------------------------------------------------------- //

module.exports = router;
