const express = require('express');
const router = express.Router();

const { resp } = require('../func/misc');

// -------------------------------------------------------------------------- //

router.get('/', async (req, res) => {
  return resp(res, 501, 'Not Implemented');
});

// -------------------------------------------------------------------------- //

module.exports = router;