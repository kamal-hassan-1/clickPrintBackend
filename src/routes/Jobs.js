const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();

const Job = require('../models/Job');
const File = require('../models/File');
const Shop = require('../models/Shop');

const { sseClients } = require('../func/sse');
const { resp, validateObjectIds } = require('../func/misc');
const { validateTransition, runSideEffects } = require('../func/jobs');

// -------------------------------------------------------------------------- //

router.get('/{:jobId}', async (req, res) => {
  let query;

  if (req.token.sid) query = { forShop: req.token.sid, status: { $in: [ 'submitted', 'queued', 'printing' ] } };
  else query = { createdBy: req.token.uid }; 
  
  if (req.params.jobId) {
    if (!mongoose.isValidObjectId(req.params.jobId)) return resp(res, 404, 'not found');

    const job = await Job.findOne({ _id: req.params.jobId, ...query }).populate('createdBy', 'name number');
    if (!job) return resp(res, 404, 'not found');

    return resp(res, 200, 'fetched job', job);
  }

  const jobs = await Job.find(query).populate('createdBy', 'name number');
  return resp(res, 200, 'fetched all jobs', jobs);
});

router.patch('/:jobId/status', validateObjectIds('jobId'), async (req, res, next) => {
  const { jobId } = req.params;
  const { status: nextStatus } = req.body;
  const role = (req.token.sid) ? 'shop' : 'user';

  if (!nextStatus) {
    return resp(res, 400, 'missing or invalid fields (status)');
  }

  try {
    const job = await Job.findById(jobId);
    if (!job) return resp(res, 404, 'not found');

    if (role === 'shop' && !job.forShop.equals(req.token.sid)) return resp(res, 403, 'forbidden');
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

// -------------------------------------------------------------------------- //

module.exports = router;