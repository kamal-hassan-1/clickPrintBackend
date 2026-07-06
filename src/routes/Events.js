const express = require('express');
const router = express.Router();

const { resp } = require('../func/misc');
const { sseClients } = require('../func/sse');

const Shop = require('../models/Shop');
(async () => await Shop.updateMany({}, { $set: { isOnline: false } }))();

// -------------------------------------------------------------------------- //

router.get('/', async (req, res) => {
  if (!req.token.sid) return resp(res, 403, 'forbidden');

  sseClients.set(req.token.sid, res);

  res.set({
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/event-stream',
  });

  res.flushHeaders();
  res.write(`event: connected\ndata: \n\n`);

  const ping = setInterval(async () => {
    const shop = await Shop.findById(req.token.sid);

    if (shop.lastSeen < (Date.now() - 10000)) {
      shop.isOnline = false;
      await shop.save();
    };

    res.write('event: ping\ndata: \n\n');
  }, 5000);

  req.on('close', async () => {
    clearInterval(ping);
    sseClients.delete(req.token.sid);
    await Shop.findByIdAndUpdate(req.token.sid, { isOnline: false });
  });
});

// -------------------------------------------------------------------------- //

module.exports = router;
