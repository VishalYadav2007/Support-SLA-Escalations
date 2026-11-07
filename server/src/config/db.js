const mongoose = require('mongoose');

function isConnected() {
  return mongoose.connection.readyState === 1;
}

async function connectDB(uri) {
  if (!uri) {
    console.log('MONGODB_URI not set — running without database. Set server/.env to enable data.');
    return false;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('Database connected');
    return true;
  } catch (err) {
    console.log('Database connection failed (MONGODB_URI unreachable). Starting without database — data endpoints will fail until it is set.');
    return false;
  }
}

mongoose.connection.on('disconnected', () => {
  if (process.env.NODE_ENV !== 'test') console.log('Database disconnected');
});

module.exports = { connectDB, isConnected };
