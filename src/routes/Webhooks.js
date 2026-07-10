const express = require('express');
const router = express.Router();

const { resp } = require('../func/misc');

const verifyWebhookSignature = (req, res, next) => {
  return next();
};

// -------------------------------------------------------------------------- //

router.get('/safepay', verifyWebhookSignature, async (req, res) => {
  return resp(res, 501, 'Not Implemented');
});

// -------------------------------------------------------------------------- //

module.exports = router;