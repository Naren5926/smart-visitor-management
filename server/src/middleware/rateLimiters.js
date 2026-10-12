const rateLimit = require('express-rate-limit');

// Slows down password guessing and bulk sign-ups. Disabled in tests so they stay deterministic.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Too many attempts, please try again later' },
});

module.exports = { authLimiter };
