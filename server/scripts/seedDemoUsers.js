// Creates demo accounts for development. Run with: npm run seed-demo
// Demo only: the passwords below are public. Never run this against real data.
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const { hashPassword } = require('../src/utils/password');
const { ROLES, STATUSES } = require('../src/constants/roles');

const DEMO_PASSWORD = 'Demo@12345';

// Student -> visitor and Teacher -> host until the backend roles are renamed.
const DEMO_USERS = [
  { name: 'Demo Admin', email: 'admin@demo.test', role: ROLES.ADMIN },
  { name: 'Demo Student', email: 'student@demo.test', role: ROLES.VISITOR },
  { name: 'Demo Teacher', email: 'teacher@demo.test', role: ROLES.HOST },
  { name: 'Demo Security', email: 'security@demo.test', role: ROLES.SECURITY },
];

(async () => {
  try {
    await connectDB(process.env.MONGODB_URI);
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    for (const u of DEMO_USERS) {
      if (await User.exists({ email: u.email })) {
        console.log(`exists:  ${u.email}`);
        continue;
      }
      await User.create({ ...u, passwordHash, status: STATUSES.ACTIVE });
      console.log(`created: ${u.email} (${u.role})`);
    }
    console.log(`\nPassword for all demo users: ${DEMO_PASSWORD}`);
  } catch (err) {
    console.error(`Seed failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
