const express = require('express');
const router = express.Router();

const Job = require('../models/Job');
const File = require('../models/File');
const Shop = require('../models/Shop');

const { resp, sseClients } = require('../func');

// -------------------------------------------------------------------------- //

router.get('/', async (req, res) => {
  let jobs;

  if (req.token.actor === 'shop') {
    jobs = await Job.find({ forShop: req.token.shop._id });
  } else if (req.token.actor === 'user') {
    jobs = await Job.find({ createdBy: req.token.user._id });
  } else {
    jobs = [];
  }

  return resp(res, 200, 'Fetched all jobs successfully', jobs);
});

router.get('/:jobId', async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) return resp(res, 400, 'Not Found');

  if (req.token.actor === 'shop' && req.token.shop._id !== job.forShop) return resp(res, 403, 'Forbidden');
  if (req.token.actor === 'user' && req.token.user._id !== job.createdBy) return resp(res, 403, 'Forbidden');

  return resp(res, 200, 'Fetched job successfully', job);
});

router.post('/', async (req, res) => {
  const { files, shop } = req.body;
  
  if (!Array.isArray(files) || files.length === 0) {
    return resp(res, 400, 'Missing or invalid fields (files)');
  }

  if (!shop || !await Shop.exists({ _id: shop })) {
    return resp(res, 400, 'Missing or invalid fields (shop)');
  }

  for (const [index, file] of files.entries()) {
    if (!file.hash || !await File.findOne({ fileId: file.hash })) {
      // return resp(res, 400, `Missing or invalid fields (file[${index}].hash)`);
    }
  }

  const job = await Job.create({
    files, forShop: shop,
    status: 'draft',
    createdBy: req.token.user._id,
  });

  return resp(res, 201, 'Created Job Successfully', job);
});

router.patch('/:jobId/status', async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) return resp(res, 400, "Not Found");
});

router.delete('/:jobId', async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) return resp(res, 200, "Job cancelled successfully");

  if (req.token.user._id !== job.createdBy) return resp(res, 403, 'Forbidden');
  if (job.status === 'printing') return resp(res, 409, "Too late to cancel, job is already being printed");

  await job.deleteById(req.params.jobId);
  sseClients[job.shop].write(`event: cancelJob\ndata: ${ req.params.jobId }\n\n`);

  resp(res, 200, "Job cancelled successfully");
});

// -------------------------------------------------------------------------- //

module.exports = router;
