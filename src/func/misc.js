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
  const chatId = number.startsWith('+') ? number : `+${number}`;
  const apiKey = process.env.NOTIFYBOT_API_KEY || process.env.SERVICE_KEY;

  if (!process.env.NOTIFYBOT_URL) {
    throw new Error('NOTIFYBOT_URL environment variable is not defined');
  }

  const baseUrl = process.env.NOTIFYBOT_URL;
  const url = baseUrl.endsWith('/send') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/send`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    },
    body: JSON.stringify({
      apiKey,
      chatId,
      message
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || errorData.error || `NotifyBot HTTP ${response.status}`;
    throw new Error(errorMessage);
  }

  return response;
};