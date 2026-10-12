require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { assertTokenConfig } = require('./utils/token');

const PORT = process.env.PORT || 5000;

const start = async () => {
  // Fail fast if the signing secret is missing or weak.
  assertTokenConfig();

  if (process.env.MONGODB_URI) {
    await connectDB(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } else {
    console.warn('MONGODB_URI is not set: starting without a database (auth routes return 503)');
  }

  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
};

start().catch((err) => {
  console.error(`Startup failed: ${err.message}`);
  process.exit(1);
});
