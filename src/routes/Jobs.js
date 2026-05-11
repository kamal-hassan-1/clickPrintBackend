const express = require('express');

const { resp } = require('../func');

const Job = require('../models/Job');
const File = require('../models/File');
const Shop = require('../models/Shop');

// -------------------------------------------------------------------------- //

const router = express.Router();

function validatePageSelection(ps) {
  return true // TODO
}

function validateSettingsObject(s) {
  if (!s || typeof s !== 'object') return { valid: false, error: 'settings object cannot be empty' };

  if (typeof s.color !== 'boolean') return { valid: false, error: 'color must be a boolean' };
  if (typeof s.pageType !== 'string' || s.pageType.trim() === '') return { valid: false, error: 'pageType must be a non-empty string' };
  if (!Number.isInteger(s.numberOfCopies) || s.numberOfCopies < 1) return { valid: false, error: 'numberOfCopies must be a positive integer' };
  if (!['portrait', 'landscape'].includes(s.orientation)) return { valid: false, error: 'orientation must be one of ["portrait", "landscape"]' };
  if (!['single', 'double'].includes(s.sidedness)) return { valid: false, error: 'sidedness must be one of ["single", "double"]' };
  if (typeof s.pageSelection !== 'string' || !validatePageSelection(s.pageSelection)) return { valid: false, error: 'pageSelection must be a valid selection string' };
  if (!Number.isInteger(s.pagesPerSheet) || ![1, 2, 4, 8, 16].includes(s.pagesPerSheet)) return { valid: false, error: 'pagesPerSheet must be one of [1, 2, 4, 8, 16]' };

  return { valid: true, error: '' };
}

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
