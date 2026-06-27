const express = require('express');
const router = express.Router();

const Shop = require('../models/Shop');
const Price = require('../models/Price');

const { resp, validateObjectId } = require('../func/misc');

// -------------------------------------------------------------------------- //

router.get('/{:shopId}', validateObjectId('shopId', { allowEmpty: true }), async (req, res) => {
  if (req.params.shopId) {
    const shop = await Shop.findById(req.params.shopId).lean();
    const prices = await Price.find({ shop: req.params.shopId });

    if (!shop) return resp(res, 404, 'not found');
    return resp(res, 200, 'fetched shop', { ...shop, prices });
  }

  return resp(res, 200, 'fetched shops', await Shop.find({ isDisabled: false }));
});

router.get('/:shopId/prices', validateObjectId('shopId'), async (req, res) => {
  return resp(res, 200, 'fetched prices', await Price.find({ shop: req.params.shopId }));
});

router.post('/:shopId/prices', validateObjectId('shopId'), async (req, res) => {
  const { name, rate, keys } = req.body || {};
  
  if (!name || !rate || !keys) return resp(res, 400, 'missing or invalid field(s) (name, rate, keys)');
  if (!req.token.sid || req.token.sid !== req.params.shopId) return resp(res, 403, 'forbidden');

  const price = await Price.create({
    name, rate, keys,
    shop: req.token.sid,
  });

  return resp(res, 201, 'created price', price);
});

router.put('/:id', validateObjectId('id'), async (req, res) => {
  if (!req.token.sid) return resp(res, 403, 'Forbidden');

  const shopAdmin = await ShopAdmin.findOne({ user: req.token.uid, shop: req.params.id });
  if (!shopAdmin) return resp(res, 403, 'You are not authorized to update this shop');

  const { name, address, capabilities } = req.body || {};
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (address !== undefined) updates.address = address;
  if (capabilities !== undefined) updates.capabilities = capabilities;

  const shop = await Shop.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!shop) return resp(res, 404, 'Shop not found');

  return resp(res, 200, 'Shop updated successfully', { shop });
});

// -------------------------------------------------------------------------- //

module.exports = router;
