const express = require('express');
const router = express.Router();

const { jwtAuth, sseClients } = require('../func');

// -------------------------------------------------------------------------- //

router.get('/', jwtAuth, async (req, res) => {
  if (req.token.actor !== 'shop') return resp(res, 403, 'Forbidden');

  res.set({
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/event-stream',
  });

  res.flushHeaders();
  sseClients.set(req.token.shop._id, res);

  // Initial hello so the client knows it's connected
  res.write(`event: connected\ndata: ${ req.token.shop._id }\n\n`);

  // Heartbeat to keep proxies from killing idle connections
  const heartbeat = setInterval(() => res.write(': keepalive\n\n'), 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(req.token.shop._id);
  });
});

// -------------------------------------------------------------------------- //

module.exports = router;