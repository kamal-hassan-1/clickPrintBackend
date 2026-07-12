const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();

const Topup = require('../models/Topup');
const File = require('../models/File');
const Shop = require('../models/Shop');

const { resp, validateObjectIds } = require('../func/misc');

// -------------------------------------------------------------------------- //

router.get('/{:topupId}', validateObjectIds('topupId', { allowEmpty: true }), async (req, res) => {
  let query = (req.token.sid) ? { shop: req.token.sid } : { createdBy: req.token.uid };

  if (req.params.topupId) {
    const topup = await Topup
      .findOne({ _id: req.params.topupId, ...query })
      .populate(Topup.filePopulate);

    if (!topup) return resp(res, 404, 'not found');
    return resp(res, 200, 'fetched topup', {topup});
  }

  const topups = await Topup
    .find(query)
    .populate(Topup.filePopulate)
    .sort({ createdAt: 1 });

  return resp(res, 200, 'fetched all topups', {topups});
});

router.post('/raast', async (req, res) => {
  return resp(res, 501, 'Not Implemented');
});

router.post('/', async (req, res) => {
  const { amount, shop, ppfid } = req.body || {};

  if (!Number.isInteger(amount) || amount < 10 || amount % 10 !== 0) {
    return resp(res, 400, 'amount must be an integer of at least 10 in multiples of 10');
  }

  if (!shop || !mongoose.isValidObjectId(shop)) {
    return resp(res, 400, 'missing or invalid fields (shop)');
  }

  if (!await Shop.exists({ _id: shop })) {
    return resp(res, 400, 'shop does not exist');
  }

  if (ppfid) {
    if (!mongoose.isValidObjectId(ppfid)) {
      return resp(res, 400, 'missing or invalid fields (ppfid)');
    }

    if (!await File.exists({ _id: ppfid })) {
      return resp(res, 400, 'file does not exist');
    }
  }

  const topup = await Topup.create({
    status: 'pending',
    amount,
    shop,
    createdBy: req.token.uid,
    paymentProofScreenshotFileId: ppfid || undefined,
  });

  await topup.populate(Topup.filePopulate);
  return resp(res, 201, 'topup created', { topup });
});

router.patch('/:topupId', validateObjectIds('topupId'), async (req, res) => {

});

// -------------------------------------------------------------------------- //

module.exports = router;