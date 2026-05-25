const jwt = require('jsonwebtoken');
const express = require('express');
const { randomInt } = require('crypto');
const router = express.Router();

const Otp = require('../models/Otp');
const Shop = require('../models/Shop');
const User = require('../models/User');

const { resp, sendViaNotifyBot } = require('../func/misc');

// -------------------------------------------------------------------------- //

const OTP_VALIDITY_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
const OTP_MAX_TRIES = 3;
const OTP_LENGTH = 5;
const JWT_EXPIRES_IN = '30d';

function isValidE164NoPlus(number) {
  return /^[1-9]\d{7,14}$/.test(number);
}

function generateOtpCode(length) {
  let otp = `${randomInt(1, 10)}`;
  for (let i = 1; i < length; i++)
    otp += randomInt(0, 10);
  return otp;
}

// -------------------------------------------------------------------------- //

router.post('/otp', async (req, res) => {
  const { number } = req.body || {};

  if (!number) return resp(res, 400, `missing or empty field 'number'`);
  if (!isValidE164NoPlus(number)) return resp(res, 400, `field 'number' is not in valid E164 format (without the +)`);

  // Rate-limit: check the existing OTP's lastSentAt independently of its expiry
  const existing = await Otp.findOne({ number }).lean();
  if (existing && Date.now() - existing.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    return resp(res, 429, 'too many requests');
  }

  const now = new Date();
  const code = generateOtpCode(OTP_LENGTH);

  // Upsert: overwrite any existing OTP for this number with a fresh one
  await Otp.findOneAndUpdate(
    { number },
    {
      code,
      number,
      tries: OTP_MAX_TRIES,
      expiry: new Date(now.getTime() + OTP_VALIDITY_MS),
      lastSentAt: now,
    },
    { upsert: true, new: true }
  );

  await sendViaNotifyBot(number, `[ClickPrint] Your OTP is: ${code}`);
  return resp(res, 200, 'otp sent');
});

router.post('/verify', async (req, res) => {
  const { code, actor, number } = req.body || {};

  if (!code || !actor || !number) {
    return resp(res, 400, 'missing or empty fields (code, actor, number)');
  }

  if (actor !== 'user' && actor !== 'shop') {
    return resp(res, 400, `invalid value for field 'actor' ('shop' or 'user')`);
  }

  const otp = await Otp.findOne({ number });

  if (!otp) return resp(res, 401, 'Invalid or expired OTP.');

  // Explicit expiry check — don't rely on Mongo's TTL sweep
  if (otp.expiry.getTime() <= Date.now()) {
    await Otp.deleteOne({ _id: otp._id });
    return resp(res, 401, 'Invalid or expired OTP.');
  }

  if (otp.tries <= 0) return resp(res, 429, 'Too many requests. Try again later.');

  if (otp.code !== code) {
    otp.tries -= 1;
    await otp.save();
    return resp(res, 401, 'Invalid or expired OTP.');
  }

  await Otp.deleteOne({ _id: otp._id });

  // Resolve / create the user
  const user = await User.findOneAndUpdate(
    { number },
    { $setOnInsert: { number } },
    { upsert: true, new: true }
  );

  let profile;
  if (actor === 'user') {
    profile = user;
  } else {
    // actor === 'shop': the number must already own a registered shop
    const shop = await Shop.findOne({ owner: user._id });
    if (!shop) return resp(res, 404, 'no shop registered for this number');
    profile = shop;
  }

  const token = jwt.sign(
    { uid: user._id, actor },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return resp(res, 200, 'otp verified', { token, profile });
});

// -------------------------------------------------------------------------- //

module.exports = router;