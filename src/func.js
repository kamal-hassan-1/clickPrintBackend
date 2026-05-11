const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { randomInt } = require('crypto');

// -------------------------------------------------------------------------- //

exports.sseClients = new Map();

// -------------------------------------------------------------------------- //

exports.resp = (res, code, message, data = {}) => {
  return res.status(code).json({
    success: (code >= 200 && code <= 299),
    message,
    data
  })
};

// -------------------------------------------------------------------------- //

exports.isValidE164NoPlus = (number) => {
  return /^[1-9]\d{7,14}$/.test(number);
};

// -------------------------------------------------------------------------- //

exports.generateOtpCode = (length) => {
  let otp = `${randomInt(1, 10)}`;
  for (let i = 1; i < length; i++)
    otp += randomInt(0, 10);
  return otp;
}

// -------------------------------------------------------------------------- //

exports.gracefulShutdown = async (server) => {
  try {
    console.log('[INFO] Attempting to gracefully shut down server');

    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    console.log('[INFO] Successfully shutdown server');

    await mongoose.connection.close();
    console.log('[INFO] Successfully closed MongoDB connection');

    process.exit(0);
  } catch (err) {
    console.error('[ERROR] Error during server shutdown:', err);
    process.exit(1);
  }
};

// -------------------------------------------------------------------------- //

exports.sendViaNotifyBot = async (number, message) => {
  return await fetch(process.env.NOTIFYBOT_URI, {
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

// -------------------------------------------------------------------------- //

exports.buildFormData = (fields) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
  }
  return form;
};

// -------------------------------------------------------------------------- //

const authMiddleware = (type) => (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return resp(res, 401, 'Missing Authorization Header');

  const [scheme, credentials] = header.split(' ');
  if (!scheme || !credentials) return resp(res, 401, 'Malformed Authorization Header');

  if (scheme.toLowerCase() === 'apikey') {
    if (credentials !== process.env.API_KEY) return resp(res, 401, 'Invalid API Key');
    return next();
  }

  if (scheme.toLowerCase() === 'bearer') {
    if (type === 'key') return resp(res, 401, 'API Key Authentication Required');

    try {
      req.user = jwt.verify(credentials, process.env.JWT_SECRET);
      return next();
    } catch (err) {
      return resp(res, 401, 'Invalid or Expired JWT');
    }
  }

  return resp(res, 401, 'Unsupported Authorization Scheme');
};

const jwtAuth = authMiddleware('any');
const keyAuth = authMiddleware('key');

module.exports = { jwtAuth, keyAuth };