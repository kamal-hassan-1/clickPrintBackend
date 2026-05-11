const express = require('express');
const { resp } = require('../func');

// -------------------------------------------------------------------------- //

const router = express.Router();

// -------------------------------------------------------------------------- //

router.get('/', async (req, res) => {
  return resp(res, 501, 'Not Implemented Yet');
});

// -------------------------------------------------------------------------- //

module.exports = router;
