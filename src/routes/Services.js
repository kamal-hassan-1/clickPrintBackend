const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();

const Service = require('../models/Service');
const Printer = require('../models/Printer');

const { resp, validateObjectIds } = require('../func/misc');

// -------------------------------------------------------------------------- //

// Validates and normalizes the service body shared by create (POST) and
// update (PUT). Returns { error } with a client message, or { data } with the
// fields ready to write. `shop` is used to ensure referenced printers belong
// to the caller's shop.
const buildServiceData = async (body, shop) => {
  const { rate, keys, printers } = body || {};

  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0) {
    return { error: 'missing or invalid field(s) (rate)' };
  }

  if (!keys || typeof keys !== 'object') {
    return { error: 'missing or invalid field(s) (keys)' };
  }

  const { colored, pageType, sidedness } = keys;

  if (typeof colored !== 'boolean') {
    return { error: 'missing or invalid field(s) (keys.colored)' };
  }
  if (!pageType || typeof pageType !== 'string') {
    return { error: 'missing or invalid field(s) (keys.pageType)' };
  }
  if (typeof sidedness !== 'boolean') {
    return { error: 'missing or invalid field(s) (keys.sidedness)' };
  }

  if (!Array.isArray(printers) || printers.length === 0) {
    return { error: 'printers must be an array of 1 or more objects' };
  }

  const normalizedPrinters = [];

  for (const [index, entry] of printers.entries()) {
    if (!entry || typeof entry !== 'object') {
      return { error: `printers[${index}] must be an object` };
    }

    const { useAuto = false, printer } = entry;

    if (typeof useAuto !== 'boolean') {
      return { error: `printers[${index}].useAuto must be a boolean` };
    }

    if (!mongoose.isValidObjectId(printer)) {
      return { error: `printers[${index}].printer is not a valid id` };
    }

    if (!await Printer.exists({ _id: printer, shop })) {
      return { error: `printers[${index}].printer does not exist` };
    }

    normalizedPrinters.push({ useAuto, printer });
  }

  // Name is derived from the keys, never taken from the client:
  // <pageType>-<CL|BW>-<DS|SS>, e.g. { A4, colored: false, sidedness: false } -> "A4-BW-SS".
  const name = `${pageType}-${colored ? 'CL' : 'BW'}-${sidedness ? 'DS' : 'SS'}`;

  return {
    data: {
      name,
      rate,
      keys: { colored, pageType, sidedness },
      printers: normalizedPrinters,
    },
  };
};

// Maps a Mongo duplicate-key (11000) error to a client message based on which
// unique index was violated. Returns null for any other error so the caller
// can rethrow it.
const duplicateMessage = (err) => {
  if (err.code !== 11000) return null;

  const keys = Object.keys(err.keyPattern || {});

  if (keys.includes('name')) {
    return 'a service with this name already exists';
  }
  if (keys.some((k) => k.startsWith('keys.'))) {
    return 'a service with these keys already exists';
  }

  return 'a service with these details already exists';
};

// -------------------------------------------------------------------------- //

router.post('/', async (req, res) => {
  if (!req.token.sid) return resp(res, 403, 'forbidden');

  const { error, data } = await buildServiceData(req.body, req.token.sid);
  if (error) return resp(res, 400, error);

  let service;
  try {
    service = await Service.create({ ...data, shop: req.token.sid });
  } catch (err) {
    const message = duplicateMessage(err);
    if (message) return resp(res, 409, message);
    throw err;
  }

  await service.populate(Service.servicePopulate);

  return resp(res, 201, 'created service', { service });
});

router.get('/{:serviceId}', validateObjectIds('serviceId', { allowEmpty: true }), async (req, res) => {
  if (!req.token.sid) return resp(res, 403, 'forbidden');

  if (req.params.serviceId) {
    const service = await Service.findOne({ _id: req.params.serviceId, shop: req.token.sid })
      .populate(Service.servicePopulate);

    if (!service) return resp(res, 404, 'not found');

    return resp(res, 200, 'fetched service', { service });
  }

  const services = await Service.find({ shop: req.token.sid })
    .populate(Service.servicePopulate);

  return resp(res, 200, 'fetched services', { services });
});

router.put('/:serviceId', validateObjectIds('serviceId'), async (req, res) => {
  if (!req.token.sid) return resp(res, 403, 'forbidden');

  const { error, data } = await buildServiceData(req.body, req.token.sid);
  if (error) return resp(res, 400, error);

  let service;
  try {
    service = await Service.findOneAndUpdate(
      { _id: req.params.serviceId, shop: req.token.sid },
      data,
      { new: true, runValidators: true },
    ).populate(Service.servicePopulate);
  } catch (err) {
    const message = duplicateMessage(err);
    if (message) return resp(res, 409, message);
    throw err;
  }

  if (!service) return resp(res, 404, 'not found');

  return resp(res, 200, 'updated service', { service });
});

router.delete('/:serviceId', validateObjectIds('serviceId'), async (req, res) => {
  if (!req.token.sid) return resp(res, 403, 'forbidden');

  const service = await Service.findOneAndDelete({ _id: req.params.serviceId, shop: req.token.sid });

  if (!service) return resp(res, 404, 'not found');

  return resp(res, 200, 'deleted service');
});

// -------------------------------------------------------------------------- //

module.exports = router;
