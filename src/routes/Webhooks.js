const express = require('express');
const router = express.Router();

const { resp } = require('../func/misc');
const { verifySafepayWebhook } = require('../func/safepay');

// -------------------------------------------------------------------------- //

router.get('/safepay', verifySafepayWebhook(process.env.SAFEPAY_WEBHOOK_SECRET), async (req, res) => {
  return resp(res, 501, 'Not Implemented');
});

// -------------------------------------------------------------------------- //

module.exports = router;