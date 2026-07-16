const express = require('express');
const router = express.Router();

const User = require('../models/User');

const { resp, validateObjectIds, isValidE164NoPlus } = require('../func/misc');

// -------------------------------------------------------------------------- //

// Every route in this router is admin-only, so the guard sits on the router
// rather than being repeated in each handler.
router.use((req, res, next) => {
  if (!req.token.isAdmin) return resp(res, 403, 'forbidden');
  return next();
});

// -------------------------------------------------------------------------- //

router.post('/', async (req, res) => {
  const { name, number } = req.body || {};

  if (!number) return resp(res, 400, 'missing or invalid field(s) (number)');
  if (!isValidE164NoPlus(number)) {
    return resp(res, 400, `field 'number' is not in valid E164 format (without the +)`);
  }

  try {
    const user = await User.create({ number, ...(name !== undefined && { name }) });
    return resp(res, 201, 'created user', { user });
  } catch (err) {
    if (err.code === 11000) return resp(res, 409, 'a user with this number already exists');
    throw err;
  }
});

router.get('/{:userId}', validateObjectIds('userId', { allowEmpty: true }), async (req, res) => {
  if (req.params.userId) {
    const user = await User.findById(req.params.userId);

    if (!user) return resp(res, 404, 'not found');
    return resp(res, 200, 'fetched user', { user });
  }

  return resp(res, 200, 'fetched users', { users: await User.find() });
});

router.put('/:userId', validateObjectIds('userId'), async (req, res) => {
  const { name, number } = req.body || {};

  if (number !== undefined && !isValidE164NoPlus(number)) {
    return resp(res, 400, `field 'number' is not in valid E164 format (without the +)`);
  }

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (number !== undefined) updates.number = number;

  try {
    const user = await User.findByIdAndUpdate(req.params.userId, updates, {
      returnDocument: 'after', runValidators: true
    });

    if (!user) return resp(res, 404, 'not found');
    return resp(res, 200, 'updated user', { user });
  } catch (err) {
    if (err.code === 11000) return resp(res, 409, 'a user with this number already exists');
    throw err;
  }
});

router.patch('/:userId/isDisabled', validateObjectIds('userId'), async (req, res) => {
  const { isDisabled } = req.body || {};

  if (typeof isDisabled !== 'boolean') {
    return resp(res, 400, 'missing or invalid field(s) (isDisabled)');
  }

  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { isDisabled },
    { returnDocument: 'after' }
  );

  if (!user) return resp(res, 404, 'not found');
  return resp(res, 200, `user ${isDisabled ? 'disabled' : 'enabled'}`, { user });
});

// -------------------------------------------------------------------------- //

module.exports = router;
