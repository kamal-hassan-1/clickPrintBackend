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

  const session = await mongoose.startSession();
  try {
    let updatedJob;
    await session.withTransaction(async () => {
      const job = await Job.findById(jobId).session(session);
      if (!job) {
        const err = new Error('not found');
        err.status = 404;
        throw err;
      }

      if (role === 'shop' && !job.forShop.equals(req.token.shopId)) {
        const err = new Error('forbidden');
        err.status = 403;
        throw err;
      }
      if (role === 'user' && !job.createdBy.equals(req.token.uid)) {
        const err = new Error('forbidden');
        err.status = 403;
        throw err;
      }

      const check = validateTransition(job.status, nextStatus, role);
      if (!check.ok) {
        const err = new Error(check.message);
        err.status = check.code;
        throw err;
      }

      job.status = nextStatus;
      job.statusHistory.push({ status: nextStatus, by: role, at: new Date() });
      await job.save({ session });

      await runSideEffects(nextStatus, job, session);

      updatedJob = job;
    });

    const shopId = updatedJob.forShop.toString();
    if (sseClients.has(shopId)) {
      sseClients.get(shopId).write(`event: jobStatusUpdate\ndata: ${JSON.stringify({ jobId, status: nextStatus })}\n\n`);
    }

    return resp(res, 200, 'job status updated', updatedJob);
  } catch (err) {
    if (err.status) return resp(res, err.status, err.message);
    next(err);
  } finally {
    session.endSession();
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