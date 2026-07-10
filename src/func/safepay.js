const crypto = require('crypto');

/**
 * Verifies a Safepay webhook signature.
 *
 * Requires the raw request body on req.rawBody (Buffer), e.g. via:
 *   app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
 *
 * @param {string} secretBase64 - The base64-encoded webhook secret from Safepay.
 * @param {number} [toleranceMs=300000] - Max allowed timestamp drift in ms. 0 disables the check.
 */
function verifySafepayWebhook(secretBase64, toleranceMs = 5 * 60 * 1000) {
  const decodedSecret = Buffer.from(secretBase64, 'base64');

  return (req, res, next) => {
    const providedSig = req.get('X-SFPY-SIGNATURE');
    const providedTs = req.get('X-SFPY-TIMESTAMP');

    if (!providedSig || !providedTs) {
      return res.status(400).json({ error: 'Missing signature or timestamp header' });
    }

    if (!Buffer.isBuffer(req.rawBody)) {
      // Guard against express.json() having consumed the stream without capturing rawBody
      return res.status(500).json({ error: 'Raw body not available for verification' });
    }

    // Optional replay protection: reject stale timestamps
    if (toleranceMs > 0) {
      const parsed = Date.parse(providedTs); // handles RFC 3339 / ISO 8601
      if (Number.isNaN(parsed)) {
        return res.status(400).json({ error: 'Invalid timestamp' });
      }
      if (Math.abs(Date.now() - parsed) > toleranceMs) {
        return res.status(400).json({ error: 'Timestamp outside tolerance' });
      }
    }

    // Signing payload = timestamp + '.' + raw_body
    const hmac = crypto.createHmac('sha256', decodedSecret);
    hmac.update(providedTs, 'utf8');
    hmac.update('.');
    hmac.update(req.rawBody); // raw bytes, untouched
    const expected = `sha256=${hmac.digest('hex')}`;

    // Constant-time compare. timingSafeEqual throws on length mismatch, so guard first.
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(providedSig);
    if (
      expectedBuf.length !== providedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, providedBuf)
    ) {
      return res.status(401).json({ error: 'Signature mismatch' });
    }

    next();
  };
}

module.exports = { verifySafepayWebhook };