const express = require('express');
const router = express.Router();

const { resp } = require('../func/misc');
const History = require('../models/History');

// -------------------------------------------------------------------------- //

router.get('/', async (req, res) => {
  const history = await History.find(
    (req.token.sid)
      ? { forShop: req.token.sid }
      : { createdBy: req.token.uid }
  );

  return resp(res, 200, 'fetched history', history);
});

// -------------------------------------------------------------------------- //

module.exports = router;