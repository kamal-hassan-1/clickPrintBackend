const express = require('express');

const { resp } = require('../func');
const Shop = require('../models/Shop');

// -------------------------------------------------------------------------- //

const router = express.Router();

// -------------------------------------------------------------------------- //

router.get('/', async (req, res) => {
  return resp(res, 200, 'Fetched Shops Successfully', {
    shops: await Shop.find()
  });
});

// -------------------------------------------------------------------------- //

module.exports = router;
