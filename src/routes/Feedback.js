const express = require('express');

const { resp } = require('../func');
const { sendViaNotifyBot } = require('../func');

// -------------------------------------------------------------------------- //

const router = express.Router();

// -------------------------------------------------------------------------- //

router.post('/', async (req, res) => {
  return resp(res, 501, 'Not Implemented Yet');
});

// -------------------------------------------------------------------------- //

module.exports = router;
