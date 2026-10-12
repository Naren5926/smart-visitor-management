const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../../src/models/User'); // the fake, because each test file mocks this path
const { hashPassword } = require('../../src/utils/password');
const { signToken } = require('../../src/utils/token');

const PASSWORD = 'correct-horse-battery';

// Pretend the database is connected (the requireDb middleware checks this).
const fakeDbConnected = (connected = true) =>
  Object.defineProperty(mongoose.connection, 'readyState', {
    get: () => (connected ? 1 : 0),
    configurable: true,
  });

const makeUser = async (overrides = {}) =>
  User.create({
    name: 'Test User',
    email: `user${Math.random().toString(36).slice(2)}@example.com`,
    passwordHash: await hashPassword(PASSWORD),
    role: 'visitor',
    status: 'active',
    ...overrides,
  });

const tokenFor = (user) => signToken(user._id);

const expiredTokenFor = (user) =>
  jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: -10,
  });

module.exports = { PASSWORD, fakeDbConnected, makeUser, tokenFor, expiredTokenFor };
