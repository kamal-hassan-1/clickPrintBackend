const express = require('express');
const router = express.Router();

const { resp } = require('../func');

const Job = require('../models/Job');
const File = require('../models/File');
const Shop = require('../models/Shop');

// -------------------------------------------------------------------------- //

router.get('/', async (req, res) => {
  return resp(res, 200, 'Fetched Jobs Successfully', await Job.find({
    createdBy: req.user._id,
    status: { $in: [ "pending", "queued" ]}
  }));
});

// -------------------------------------------------------------------------- //

router.post('/', async (req, res) => {
  const { files, forShop } = req.body;
  
  if (!Array.isArray(files) || files.length === 0) {
    return resp(res, 400, 'Missing or invalid fields (files)');
  }

  if (!forShop || !await Shop.exists({ _id: forShop })) {
    return resp(res, 400, 'Missing or invalid fields (forShop)');
  }

  for (const [index, file] of files.entries()) {
    if (!file.hash || !await File.findOne({ fileId: file.hash })) {
      return resp(res, 400, `Missing or invalid fields (file[${index}].hash)`);
    }

    const { valid, error } = validateSettingsObject(file.settings);
    if (!valid) return resp(res, 400, `file[${index}]: ${error}`);
  }

  const job = await Job.create({
    files, forShop,
    status: 'pending',
    createdBy: req.user._id,
  });

  return resp(res, 201, 'Created Job Successfully', job);
});

// -------------------------------------------------------------------------- //

module.exports = router;
