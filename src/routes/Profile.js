const express = require('express');
const router = express.Router();

const { resp } = require('../func/misc');
const User = require('../models/User');

// -------------------------------------------------------------------------- //

router.get('/', async (req, res) => {
  return resp(res, 200, 'Profile fetched successfully', {
    profile: await User.findById(req.token.uid)
  });
});

router.patch('/', async (req, res) => {
  const { name } = req.body || {};
  if (!name) return resp(res, 400, 'Missing or invalid fields (name)');

  const user = await User.findByIdAndUpdate(
    req.token.uid, { name }, { returnDocument: 'after' }
  );

  return resp(res, 200, 'Profile updated successfully', { profile: user });
});

// -------------------------------------------------------------------------- //

module.exports = router;