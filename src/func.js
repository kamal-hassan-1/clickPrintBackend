const jwt = require('jsonwebtoken');
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

// -------------------------------------------------------------------------- //

exports.buildFormData = (fields) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
  }
  return form;
};

// -------------------------------------------------------------------------- //

exports.jwtAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return exports.resp(res, 401, 'Missing Authorization Header');

  const token = header.split(' ')[1];
  if (!token) return exports.resp(res, 401, 'Malformed Authorization Header');

  try {
    req.token = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (err) {
    return exports.resp(res, 401, 'Invalid or Expired JWT');
  }
};

exports.keyAuth = (req, res, next) => {};