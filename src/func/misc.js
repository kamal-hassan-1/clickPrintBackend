const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { randomInt } = require('crypto');

exports.resp = (res, code, message, data = {}) => {
  return res.status(code).json({
    success: (code >= 200 && code <= 299),
    message,
    data
  })
};

exports.isValidE164NoPlus = (number) => {
  return /^[1-9]\d{7,14}$/.test(number);
};

exports.validateObjectIds = (...args) => (req, res, next) => {
  let options = {};
  let params = args;

  const last = args[args.length - 1];
  if (typeof last === 'object' && last !== null) {
    options = last;
    params = args.slice(0, -1);
  }

  const { allowEmpty = false } = options;

  for (const param of params) {
    const value = req.params[param];

    if (allowEmpty && !value) {
      continue;
    }

    if (!mongoose.isValidObjectId(value)) {
      return exports.resp(res, 400, `Invalid ObjectId for '${param}'`);
    }
  }

  next();
};

exports.sendViaNotifyBot = async (number, message) => {
  return await fetch(process.env.NOTIFYBOT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chatId: `${number}@c.us`,
      message
    })
  });
};