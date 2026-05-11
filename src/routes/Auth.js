const express = require('express');
const jwt = require('jsonwebtoken');

const Otp = require('../models/Otp');
const User = require('../models/User');

const { resp } = require('../func');
const { isValidE164NoPlus, generateOtpCode, sendViaNotifyBot } = require('../func');

// -------------------------------------------------------------------------- //

const router = express.Router();

// -------------------------------------------------------------------------- //

router.post('/otp', async (req, res) => {
  const { number } = req.body || {};

  if (!number) return resp(res, 400, 'Missing or empty fields (number)');
  if (!isValidE164NoPlus(number)) return resp(res, 400, `Field 'number' is not valid E164 (without +)`);

  try {
    const code = generateOtpCode(5);
    await Otp.create({
      code,
      number,
      tries: 3,
      expiry: new Date(Date.now() + 1 * 60 * 1000)
    });

    await sendViaNotifyBot(number, `[ClickPrint] Your OTP is: ${code}`);
    return resp(res, 200, 'OTP Sent Successfully');
  }

  catch (err) {
    if (err.code === 11000)
      return resp(res, 429, 'Too many requests');
    else throw err;
  }
});

// -------------------------------------------------------------------------- //

router.post('/verify', async (req, res) => {
  const { code, number } = req.body || {};

  if (!code || !number) {
    return resp(res, 400, 'Missing or empty fields (code, number).');
  }

  const otp = await Otp.findOne({ number });

  if (!otp) return resp(res, 401, 'Invalid or expired OTP.');
  if (otp.tries <= 0) return resp(res, 429, 'Too many requests. Try again later.');

  if (otp.code != code) {
    otp.tries -= 1;
    await otp.save();
    return resp(res, 401, 'Invalid or expired OTP.');
  }

  await Otp.deleteOne({ _id: otp._id });

  // Create user if not exists
  const user = await User.findOneAndUpdate(
    { number },
    { $setOnInsert: { number } },
    { upsert: true, new: true }
  );

  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
  return resp(res, 200, 'Verified OTP Successfully', { token, profile: user });
});

// -------------------------------------------------------------------------- //

module.exports = router;
