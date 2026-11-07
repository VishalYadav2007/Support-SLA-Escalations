const dns = require('node:dns/promises');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const createApp = require('./app');
const { connectDB } = require('./config/db');
const mongoose = require('mongoose');

const app = createApp();
const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB(process.env.MONGODB_URI);
  const server = app.listen(PORT, () => console.log('Server listening on port ' + PORT));
  const shutdown = () => {
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();
