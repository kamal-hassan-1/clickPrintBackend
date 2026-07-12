const express = require('express');
const router = express.Router();

const Printer = require('../models/Printer');

const { resp, validateObjectIds } = require('../func/misc');

// -------------------------------------------------------------------------- //

router.get('/', async (req, res) => {
  if (!req.token.sid) return resp(res, 403, 'forbidden');

  const printers = await Printer.find({ shop: req.token.sid });

  return resp(res, 200, 'fetched printers', { printers });
});

router.post('/', async (req, res) => {
  const { name } = req.body || {};

  if (!name) return resp(res, 400, 'missing or invalid field(s) (name)');
  if (!req.token.sid) return resp(res, 403, 'forbidden');

  const printer = await Printer.create({
    name,
    shop: req.token.sid,
  });

  return resp(res, 201, 'created printer', { printer });
});

router.delete('/:printerId', validateObjectIds('printerId'), async (req, res) => {
  if (!req.token.sid) return resp(res, 403, 'forbidden');

  const printer = await Printer.findOneAndDelete({ _id: req.params.printerId, shop: req.token.sid });

  if (!printer) return resp(res, 404, 'not found');

  return resp(res, 200, 'deleted printer');
});

// -------------------------------------------------------------------------- //

module.exports = router;
