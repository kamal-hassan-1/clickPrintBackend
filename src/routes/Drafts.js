const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();

const Job = require('../models/Job');
const File = require('../models/File');
const Shop = require('../models/Shop');
const Price = require('../models/Price');
const Draft = require('../models/Draft');

const { runSideEffects } = require('../func/jobs');
const { calculateJobCost } = require('../func/cost');
const { notifyShopOnJobsUpdate } = require('../func/sse');
const { resp, validateObjectIds } = require('../func/misc');

const draftPopulate = [
  { path: 'shop', select: 'name' },
  { path: 'createdBy', select: 'name number' },
  { path: 'docs.file', select: 'originalName numberOfPages' }
];

// -------------------------------------------------------------------------- //

router.post('/', async (req, res) => {
  const { docs, shop } = req.body || {};

  // TODO: validateObjectIds shop
  
  if (shop && !await Shop.exists({ _id: shop })) {
    return resp(res, 400, 'shop does not exist');
  }

  if (docs) {
    if (!Array.isArray(docs) || docs.length === 0) {
      return resp(res, 400, 'docs must be an array of 1 or more objects');
    }

    for (const [index, doc] of docs.entries()) {
      // TODO: validateObjectIds doc.file

      if (!doc.file || !await File.exists({ _id: doc.file })) {
        return resp(res, 400, `file does not exist`);
      }
    }
  }

  const draft = await Draft.create({
    docs, shop,
    createdBy: req.token.uid,
  });

  await draft.populate(draftPopulate);
  return resp(res, 201, 'draft created', draft);
});

router.get('/{:draftId}', validateObjectIds('draftId', { allowEmpty: true }), async (req, res) => {
  if (req.params.draftId) {
    console.log(req.params.draftId);
    const draft = await Draft.findById(req.params.draftId).populate(draftPopulate);

    if (!draft) return resp(res, 404, 'not found');
    if (!draft.createdBy.equals(req.token.uid)) return resp(res, 403, 'forbidden');

    return resp(res, 200, 'fetched draft', draft);
  }

  const drafts = await Draft.find({ createdBy: req.token.uid }).populate(draftPopulate);
  return resp(res, 200, 'fetched all drafts', drafts);
});

router.patch('/:draftId', validateObjectIds('draftId'), async (req, res) => {
  const { docs, shop } = req.body || {};

  // TODO: validateObjectIds shop

  const draft = await Draft.findById(req.params.draftId);

  if (!draft) return resp(res, 404, 'not found');
  if (!draft.createdBy.equals(req.token.uid)) return resp(res, 403, 'forbidden');

  if (shop !== undefined) {
    if (!shop) {
      return resp(res, 400, 'shop cannot be cleared');
    }

    if (!await Shop.exists({ _id: shop })) {
      return resp(res, 400, 'shop does not exist');
    }

    draft.shop = shop;
  }

  if (docs !== undefined) {
    if (!Array.isArray(docs)) {
      return resp(res, 400, 'docs must be an array');
    }

    for (const doc of docs) {
      // TODO: validateObjectIds doc.file

      if (!doc.file || !await File.exists({ _id: doc.file })) {
        return resp(res, 400, `file does not exist`);
      }
    }

    draft.docs = docs;
  }

  delete draft.cost;

  await draft.save();
  await draft.populate(draftPopulate);

  return resp(res, 200, 'draft updated', draft);
});

router.delete('/:draftId', validateObjectIds('draftId'), async (req, res) => {
  const draft = await Draft.findById(req.params.draftId);

  if (!draft) return resp(res, 404, 'not found');
  if (!draft.createdBy.equals(req.token.uid)) return resp(res, 403, 'forbidden');

  await Draft.deleteOne(draft);
  return resp(res, 200, 'draft deleted');
});

// -------------------------------------------------------------------------- //

router.patch('/:draftId/check', validateObjectIds('draftId'), async (req, res, next) => {
  const draft = await Draft.findById(req.params.draftId);

  if (!draft) return resp(res, 404, 'not found');
  if (!draft.createdBy.equals(req.token.uid)) return resp(res, 403, 'forbidden');

  if (!draft.shop) {
    return resp(res, 400, 'draft is missing shop');
  }

  if (!Array.isArray(draft.docs) || draft.docs.length === 0) {
    return resp(res, 400, 'draft has no docs');
  }

  for (const [index, doc] of draft.docs.entries()) {
    if (!doc.file) {
      return resp(res, 400, `docs[${index}] is missing file`);
    }
    if (!doc.settings) {
      return resp(res, 400, `docs[${index}] is missing settings`);
    }
  }

  const prices = await Price.find({ shop: draft.shop }).lean();

  try {
    draft.cost = await calculateJobCost(draft.docs, prices);
  }
  catch (err) {
    return resp(res, 400, `unable to price job (${err.message})`);
  }

  await draft.save();
  await draft.populate(draftPopulate);

  return resp(res, 200, 'draft checked', draft);
});

router.patch('/:draftId/submit', validateObjectIds('draftId'), async (req, res, next) => {
  const draft = await Draft.findById(req.params.draftId).lean();

  if (!draft) return resp(res, 404, 'not found');
  if (!draft.createdBy.equals(req.token.uid)) return resp(res, 403, 'forbidden');

  const session = await mongoose.startSession();

  try {
    let job;

    // Convert the draft into a submitted job and charge the wallet as one
    // unit of work: if deductWallet throws (e.g. insufficient funds), the
    // job creation and draft deletion roll back together.
    await session.withTransaction(async () => {
      await Draft.deleteOne({ _id: req.params.draftId }, { session });

      [job] = await Job.create([{
        ...draft,
        status: 'submitted',
        statusHistory: [{ status: 'submitted', at: Date.now(), by: req.token.uid }]
      }], { session });

      await runSideEffects('submitted', job, session);
    });

    notifyShopOnJobsUpdate(job.forShop.toString());
    return resp(res, 200, 'job created', job);
  }

  catch (err) {
    if (/insufficient balance/i.test(err.message)) {
      return resp(res, 402, 'insufficient balance');
    }
    return next(err);
  }

  finally {
    await session.endSession();
  }
});

// -------------------------------------------------------------------------- //

module.exports = router;