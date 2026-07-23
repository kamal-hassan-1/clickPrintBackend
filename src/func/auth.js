const jwt = require('jsonwebtoken');
const { resp } = require('./misc');
const Owner = require('../models/Owner');

exports.jwtAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return resp(res, 401, 'Missing Authorization Header');

  const [scheme, token] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer') {
    return resp(res, 401, 'Invalid Authorization Scheme');
  }
  if (!token) return resp(res, 401, 'Malformed Authorization Header');

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload && payload.uid && !payload.sid) {
      const ownerDoc = await Owner.findOne({ user: payload.uid }).lean();
      if (ownerDoc) {
        payload.sid = ownerDoc.shop;
      }
    }
    req.token = payload;
    return next();
  } catch (err) {
    return resp(res, 401, 'Invalid or Expired JWT');
  }
};

exports.keyAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return resp(res, 401, 'missing authorization header');

  const [scheme, key] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'apikey') {
    return resp(res, 401, 'invalid authorization scheme');
  }
  if (!key) return resp(res, 401, 'malformed authorization header');

  if (key !== process.env.SERVICE_KEY) {
    return resp(res, 403, 'invalid service key');
  }

  return next();
};