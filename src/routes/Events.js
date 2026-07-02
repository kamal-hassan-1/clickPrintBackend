const express = require('express');
const router = express.Router();

const Shop = require('../models/Shop');

const { resp } = require('../func/misc');
const { sseClients } = require('../func/sse');

async function checkOnlineOutcome(shopId) {
  const shop = await Shop.findById(shopId);
  if (!shop) return;

  if (shop.lastSeen < (Date.now() - 30000)) {
    shop.isOnline = false;
  }

  await shop.save();
};

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

  const ping = setInterval(() => {
    checkOnlineOutcome();
    res.write('event: ping\ndata: \n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(ping);
    checkOnlineOutcome();
    sseClients.delete(req.token.sid);
  });
});

// -------------------------------------------------------------------------- //

module.exports = router;