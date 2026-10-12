// Creates the first Admin account. Run once with: npm run create-admin
// Reads ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD from server/.env (never committed).
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const { createFirstAdmin } = require('../src/services/bootstrapAdmin');

(async () => {
  try {
    const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, MONGODB_URI } = process.env;
    if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error('Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in server/.env first');
    }
    await connectDB(MONGODB_URI);
    const admin = await createFirstAdmin({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    console.log(`Admin created: ${admin.email}`);
    console.log('Now remove ADMIN_PASSWORD from server/.env.');
  } catch (err) {
    console.error(`Could not create admin: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
