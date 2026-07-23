const express = require('express');
const router = express.Router();

const Shop = require('../models/Shop');
const File = require('../models/File');
const Service = require('../models/Service');

const { extrapolateCapabilities } = require('../func/shops');
const { resp, validateObjectIds } = require('../func/misc');

// -------------------------------------------------------------------------- //

router.post('/', async (req, res) => {
  if (!req.token.isAdmin) return resp(res, 403, 'forbidden');

  const { name, address, coordinates, imageFile, contactNumber, googleMapsLink, timings } = req.body || {};

  if (!name || !address || !coordinates || !imageFile || !contactNumber || !timings) {
    return resp(res, 400, 'missing or invalid field(s) (name, address, coordinates, imageFile, contactNumber, timings)');
  }

  if (!await File.exists({ _id: imageFile })) {
    return resp(res, 400, 'imageFile does not exist');
  }

  const shop = await Shop.create({ name, address, coordinates, imageFile, contactNumber, googleMapsLink, timings });

  return resp(res, 201, 'created shop', { shop });
});

// -------------------------------------------------------------------------- //

router.get('/{:shopId}', validateObjectIds('shopId', { allowEmpty: true }), async (req, res) => {
  if (req.params.shopId) {
    const shop = await Shop.findById(req.params.shopId).lean();

    if (!shop) return resp(res, 404, 'not found');

    const services = await Service.find({ shop: shop._id }).lean();
    shop.services = services;
    shop.capabilities = extrapolateCapabilities(services);

    return resp(res, 200, 'fetched shop', { shop });
  }

  const filter = req.token.isAdmin ? {} : { isDisabled: false };
  const shops = await Shop.find(filter).lean();
  const shopIds = shops.map((s) => s._id);

  const services = await Service.find({ shop: { $in: shopIds } }).lean();
  const servicesByShop = {};
  for (const s of services) {
    const sid = s.shop.toString();
    if (!servicesByShop[sid]) servicesByShop[sid] = [];
    servicesByShop[sid].push(s);
  }

  for (const shop of shops) {
    const shopServices = servicesByShop[shop._id.toString()] || [];
    shop.services = shopServices;
    shop.capabilities = extrapolateCapabilities(shopServices);
  }

  return resp(res, 200, 'fetched shops', { shops });
});

// -------------------------------------------------------------------------- //

router.put('/:shopId', validateObjectIds('shopId'), async (req, res) => {
  const isAdmin = !!req.token.isAdmin;
  const isOwner = !!req.token.sid && req.token.sid === req.params.shopId;

  if (!isAdmin && !isOwner) return resp(res, 403, 'forbidden');

  const allowed = isAdmin
    ? ['name', 'address', 'coordinates', 'imageFile', 'contactNumber', 'googleMapsLink', 'timings']
    : ['contactNumber', 'googleMapsLink', 'timings'];

  const body = req.body || {};
  const updates = {};
  for (const field of allowed) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  if (updates.imageFile !== undefined && !await File.exists({ _id: updates.imageFile })) {
    return resp(res, 400, 'imageFile does not exist');
  }

  const shop = await Shop.findByIdAndUpdate(req.params.shopId, updates, {
    returnDocument: 'after', runValidators: true
  });

  if (!shop) return resp(res, 404, 'not found');

  return resp(res, 200, 'updated shop', { shop });
});

// -------------------------------------------------------------------------- //

router.patch('/:shopId/isDisabled', validateObjectIds('shopId'), async (req, res) => {
  if (!req.token.isAdmin) return resp(res, 403, 'forbidden');

  const { isDisabled } = req.body || {};

  if (typeof isDisabled !== 'boolean') {
    return resp(res, 400, 'missing or invalid field(s) (isDisabled)');
  }

  const shop = await Shop.findByIdAndUpdate(
    req.params.shopId,
    { isDisabled },
    { returnDocument: 'after', runValidators: true },
  );

  if (!shop) return resp(res, 404, 'not found');

  return resp(res, 200, 'updated shop', { shop });
});

// -------------------------------------------------------------------------- //

router.delete('/:shopId', validateObjectIds('shopId'), async (req, res) => {
  return resp(res, 501, 'not implemented yet');
});

// -------------------------------------------------------------------------- //

module.exports = router;