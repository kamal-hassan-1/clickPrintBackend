const morgan = require('morgan');
const express = require('express');
const mongoose = require('mongoose');

const { resp, gracefulShutdown } = require('./func');

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
  'API_KEY',
  'JWT_SECRET',
  'MONGODB_URI',
  'ABSOLUTE_URI',
  'GOTENBERG_URI',
  'NOTIFYBOT_URI',
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

app.use('/events', require('./routes/Events.controller.js'));

router.use('/api/auth', require('./routes/Auth.js'));
router.use('/api/files', require('./routes/Files.js'));

router.use('/api/jobs', jwtAuth, require('./routes/Jobs.js'));
router.use('/api/shops', jwtAuth, require('./routes/Shops.js'));
router.use('/api/history', jwtAuth, require('./routes/History.js'));
router.use('/api/profile', jwtAuth, require('./routes/Profile.js'));

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

process.on('SIGINT', () => gracefulShutdown(server));
process.on('SIGTERM', () => gracefulShutdown(server));
