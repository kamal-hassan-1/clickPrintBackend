const express = require('express');
const router = express.Router();

const { resp } = require('../func');
const Shop = require('../models/Shop');

// -------------------------------------------------------------------------- //

router.get('/', async (req, res) => {
  return resp(res, 200, 'Shops fetched successfully', {
    shops: await Shop.find()
  });
});

// -------------------------------------------------------------------------- //

module.exports = router;