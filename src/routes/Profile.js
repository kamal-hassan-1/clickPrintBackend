const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Shop = require('../models/Shop');

const { resp } = require('../func/misc');

// -------------------------------------------------------------------------- //

router.get('/', async (req, res) => {
  const user = await User.findById(req.token.uid);
  const shop = req.token.sid ? await Shop.findById(req.token.sid) : null;

  return resp(res, 200, 'fetched profile', { profile: user, ...(shop && { shop }) });
});

router.patch('/', async (req, res) => {
  const { name } = req.body || {};
  if (!name) return resp(res, 400, 'missing or invalid fields (name)');

  const user = await User.findByIdAndUpdate(
    req.token.uid, { name }, { returnDocument: 'after' }
  );

  return resp(res, 200, 'profile updated', { profile: user });
});

router.post('/pushTokens', async (req, res) => {
  const { expoPushToken } = req.body || {};

  const user = await User.updateOne(
    { _id: req.token.uid },
    { $addToSet: { pushTokens: expoPushToken } },
    { new: true }
  );

  return resp(res, 200, 'added push token', { tokens: user.pushTokens })
});

// -------------------------------------------------------------------------- //

module.exports = router;