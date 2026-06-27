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

exports.validateObjectId = (param, options = {}) => (req, res, next) => {
  const { allowEmpty = false } = options;
  const value = req.params[param];

  if (allowEmpty && !value) {
    return next();
  }

  if (!mongoose.isValidObjectId(value)) {
    return exports.resp(res, 404, 'Not Found');
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