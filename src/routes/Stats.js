const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Admin = require('../models/Admin');
const Shop = require('../models/Shop');

const { resp } = require('../func/misc');

// -------------------------------------------------------------------------- //

router.get('/users', async (req, res) => {
  if (!req.token.isAdmin) return resp(res, 403, 'forbidden');

  // distinct() flattens array fields, so this holds if a shop gains many owners.
  const [ adminIds, ownerIds ] = await Promise.all([
    Admin.distinct('user'),
    Shop.distinct('owner'),
  ]);

  const [ users, appUsers ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ _id: { $nin: [ ...adminIds, ...ownerIds ] } }),
  ]);

  return resp(res, 200, 'fetched user stats', {
    users,
    admins: adminIds.length,
    owners: ownerIds.length,
    appUsers,
  });
});

// -------------------------------------------------------------------------- //

module.exports = router;