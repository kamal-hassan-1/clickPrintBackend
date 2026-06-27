const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();

const Job = require('../models/Job');
const File = require('../models/File');
const Shop = require('../models/Shop');
const Price = require('../models/Price');
const Draft = require('../models/Draft');

const { calculateJobCost } = require('../func/cost');
const { runSideEffects } = require('../func/jobs');
const { resp, validateObjectIds } = require('../func/misc');

// -------------------------------------------------------------------------- //

router.get('/{:draftId}', validateObjectIds('draftId', { allowEmpty: true }), async (req, res) => {
  if (req.params.draftId) {
    const draft = await Draft.findById(req.params.draftId).populate('createdBy', 'name number');

    if (!draft) return resp(res, 404, 'not found');
    if (!draft.createdBy.equals(req.token.uid)) return resp(res, 403, 'forbidden');

    return resp(res, 200, 'fetched draft', draft);
  }

  const drafts = await Draft.find({ createdBy: req.token.uid }).populate('createdBy', 'name number');
  return resp(res, 200, 'fetched all drafts', drafts);
});

router.post('/', async (req, res) => {
  const { files, forShop } = req.body;
  
  if (!Array.isArray(files) || files.length === 0) {
    return resp(res, 400, 'missing or invalid fields (files)');
  }

  if (!forShop || !await Shop.exists({ _id: forShop })) {
    return resp(res, 400, 'missing or invalid fields (forShop)');
  }

  for (const [index, file] of files.entries()) {
    if (!file.fileId || !await File.findOne({ fileId: file.fileId })) {
      return resp(res, 400, `missing or invalid fields (file[${index}].fileId)`);
    }
  }

  const prices = await Price.find({ shop: forShop }).lean();

  let cost;
  try {
    cost = await calculateJobCost(files, prices);
  } catch (err) {
    return resp(res, 400, `unable to price job (${err.message})`);
  }

  const draft = await Draft.create({
    cost, files, forShop,
    createdBy: req.token.uid,
  });

  return resp(res, 201, 'draft created', draft);
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
                statusHistory: [
                    { status: 'submitted', at: Date.now(), by: req.token.uid }
                ]
            }], { session });

            await runSideEffects('submitted', job, session);
        });

        return resp(res, 200, 'job created', job);
    } catch (err) {
        if (/insufficient balance/i.test(err.message)) {
            return resp(res, 402, 'insufficient balance');
        }
        return next(err);
    } finally {
        await session.endSession();
    }
});

router.put('/:draftId', validateObjectIds('draftId'), async (req, res) => {
  return resp(res, 501, 'Not Implemented Yet'); // TODO
});

router.delete('/:draftId', validateObjectIds('draftId'), async (req, res) => {
  return resp(res, 501, 'Not Implemented Yet'); // TODO
});

// -------------------------------------------------------------------------- //

module.exports = router;