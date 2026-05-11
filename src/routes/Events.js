const express = require('express');
const router = express.Router();

const { sseClients } = require('../func');

// -------------------------------------------------------------------------- //

app.get('/', async (req, res) => {
  res.set({
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/event-stream',
  });

  res.flushHeaders();
  sseClients.set(req.user.id, res);

  // Initial hello so the client knows it's connected
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);

  // Heartbeat to keep proxies from killing idle connections
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(req.user.id);
  });
});