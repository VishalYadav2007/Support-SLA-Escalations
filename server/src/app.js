const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { isConnected } = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
  app.use(express.json({ limit: '100kb' }));
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', db: isConnected() ? 'connected' : 'disconnected' });
  });
  app.use('/api/policy', require('./routes/policy'));
  app.use('/api/tickets', require('./routes/tickets'));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
module.exports = createApp;
