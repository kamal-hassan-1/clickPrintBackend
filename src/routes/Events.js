const express = require('express');
const router = express.Router();

const { resp } = require('../func/misc');
const { sseClients } = require('../func/sse');

// -------------------------------------------------------------------------- //

router.get('/', async (req, res) => {
  if (req.token.actor !== 'shop') return resp(res, 403, 'Forbidden');

  res.set({
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/event-stream',
  });

  res.flushHeaders();
  sseClients.set(req.token.shopId, res);

  // Initial hello so the client knows it's connected
  res.write(`event: connected\ndata: ${ req.token.shopId }\n\n`);

  // Heartbeat to keep proxies from killing idle connections
  const heartbeat = setInterval(() => res.write(': keepalive\n\n'), 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(req.token.shopId);
  });
});

// -------------------------------------------------------------------------- //

module.exports = router;