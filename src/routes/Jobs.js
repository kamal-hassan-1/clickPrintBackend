const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();

const Job = require('../models/Job');
const File = require('../models/File');
const Shop = require('../models/Shop');

const { sseClients } = require('../func/sse');
const { resp, validateObjectId } = require('../func/misc');
const { validateTransition, runSideEffects } = require('../func/jobs');

// -------------------------------------------------------------------------- //

router.get('/{:jobId}', async (req, res) => {
  let query;

  if (req.token.actor === 'shop') query = { forShop: req.token.shopId };
  else if (req.token.actor === 'user') query = { createdBy: req.token.uid };
  else return resp(res, 403, 'forbidden');

  if (req.params.jobId) {
    if (!mongoose.isValidObjectId(req.params.jobId)) {
      return resp(res, 404, 'not found');
    }

    const job = await Job.findOne({ _id: req.params.jobId, ...query });
    if (!job) return resp(res, 404, 'not found');

    return resp(res, 200, 'fetched job', job);
  }

  const jobs = await Job.find(query);
  return resp(res, 200, 'fetched all jobs', jobs);
});

router.patch('/:jobId/status', validateObjectId('jobId'), async (req, res, next) => {
  const { jobId } = req.params;
  const { status: nextStatus } = req.body;
  const role = req.token.actor;

  if (!nextStatus) {
    return resp(res, 400, 'missing or invalid fields (status)');
  }

  try {
    const job = await Job.findById(jobId);
    if (!job) return resp(res, 404, 'not found');

    if (role === 'shop' && !job.forShop.equals(req.token.shopId)) return resp(res, 403, 'forbidden');
    if (role === 'user' && !job.createdBy.equals(req.token.uid)) return resp(res, 403, 'forbidden');

    const check = validateTransition(job.status, nextStatus, role);
    if (!check.ok) return resp(res, check.code, check.message);

    job.status = nextStatus;
    job.statusHistory.push({ status: nextStatus, by: role, at: new Date() });
    await job.save();

    await runSideEffects(nextStatus, job);

    const shopId = job.forShop.toString();
    if (sseClients.has(shopId)) {
      sseClients.get(shopId).write(`event: jobStatusUpdate\ndata: ${JSON.stringify({ jobId, status: nextStatus })}\n\n`);
    }

    return resp(res, 200, 'job status updated', job);
  } catch (err) {
    next(err);
  }
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
    if (!file.hash || !await File.findOne({ fileId: file.hash })) {
      return resp(res, 400, `missing or invalid fields (file[${index}].hash)`);
    }
  }

  const job = await Job.create({
    files, forShop,
    status: 'draft',
    createdBy: req.token.uid,
  });

  return resp(res, 201, 'new job created', job);
});

// -------------------------------------------------------------------------- //

module.exports = router;