const express = require('express');
const router = express.Router();

const File = require('../models/File');
const Shop = require('../models/Shop');
const Draft = require('../models/Draft');

const { resp, validateObjectId } = require('../func/misc');
const Job = require('../models/Job');
const { calculateJobCost } = require('../func/cost');

// -------------------------------------------------------------------------- //

router.get('/{:draftId}', validateObjectId('draftId', { allowEmpty: true }), async (req, res) => {
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

  const shop = await Shop.findById(forShop);
  const cost = calculateJobCost(files, shop.priceList);

  const draft = await Draft.create({
    cost, files, forShop,
    createdBy: req.token.uid,
  });

  return resp(res, 201, 'draft created', draft);
});

// router.patch('/:draftId', validateObjectId('draftId'), async (req, res) => {
//     const draft = await Draft.findById(req.params.draftId).lean();
    
//     if (!draft) return resp(res, 404, 'not found');
//     if (!draft.createdBy.equals(req.token.uid)) return resp(res, 403, 'forbidden');

//     let job;
//     const session = await mongoose.startSession();

//     try {
//         await session.withTransaction(async () => {
//             await Draft.deleteOne({ _id: req.params.draftId }, { session });

//             [job] = await Job.create([{
//                 ...draftData,
//                 status: 'submitted',
//                 statusHistory: [
//                     { status: 'submitted', at: Date.now(), by: req.token.uid }
//                 ]
//             }], { session });
//         });

//     return resp(res, 200, 'job created', job);
// } finally {
//     session.endSession(); // always runs, even if error is thrown
// }

//     await Draft.deleteOne({ _id: req.params.draftId });

//     const job = await Job.create({
//         ...draft,
//         status: 'submitted',
//         statusHistory: [
//             { status: 'submitted', at: Date.now(), by: req.token.uid }
//         ]
//     });


//     return resp(res, 200, 'job created', job);
// });

// -------------------------------------------------------------------------- //

module.exports = router;