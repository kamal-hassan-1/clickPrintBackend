const morgan = require('morgan');
const express = require('express');
const mongoose = require('mongoose');

const { resp, jwtAuth } = require('./func');

// -------------------------------------------------------------------------- //

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

// -------------------------------------------------------------------------- //

app.use(express.json());
app.use(morgan('combined', {
  skip: (req, res) => req.path === '/health'
}));

// -------------------------------------------------------------------------- //

const required = [
  'JWT_SECRET',
  'MONGODB_URI',
  'INTERNAL_URL',
  'GOTENBERG_URL',
  'NOTIFYBOT_URL',
];

for (const v of required) {
  if (!process.env[v]) {
    console.error(`[ERROR] ${v} environment variable is required`);
    process.exit(1);
  }
}

// -------------------------------------------------------------------------- //

mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('[INFO] Successfully connected to MongoDB'))
.catch(err => {
  console.error('[ERROR] Failed to connect to MongoDB:', err);
  process.exit(1);
});

// -------------------------------------------------------------------------- //

// Return 200 if MongoDB is reachable, 503 otherwise
app.get('/health', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.sendStatus(200);
  }
  catch (err) {
    console.error('[ERROR] Failed Health Check:', err);
    res.sendStatus(503);
  }
});

// -------------------------------------------------------------------------- //

app.use('/events', require('./routes/Events.js'));

app.use('/api/auth', require('./routes/Auth.js'));
app.use('/api/files', require('./routes/Files.js'));

app.use('/api/jobs', jwtAuth, require('./routes/Jobs.js'));
app.use('/api/shops', jwtAuth, require('./routes/Shops.js'));
app.use('/api/history', jwtAuth, require('./routes/History.js'));
app.use('/api/profile', jwtAuth, require('./routes/Profile.js'));

// -------------------------------------------------------------------------- //

app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  resp(res, 500, 'Internal Server Error');
});

// -------------------------------------------------------------------------- //

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log('[INFO] Server listening on port', PORT);
});

// -------------------------------------------------------------------------- //

const gracefulShutdown = async (server) => {
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

process.on('SIGINT', () => gracefulShutdown(server));
process.on('SIGTERM', () => gracefulShutdown(server));