const jwt = require('jsonwebtoken');

const ALGORITHM = 'HS256';

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret === 'change-me') {
    throw new Error('JWT_SECRET must be set to a random string of at least 32 characters');
  }
  return secret;
};

// Called at startup so a bad configuration fails immediately and loudly.
const assertTokenConfig = () => {
  getSecret();
};

// The token only carries the user id. Role and status are re-read from the database on every
// request, so a role change or deactivation takes effect immediately.
const signToken = (userId) =>
  jwt.sign({ sub: String(userId) }, getSecret(), {
    algorithm: ALGORITHM,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

// Pinning the algorithm list blocks "alg: none" and algorithm-confusion tricks.
const verifyToken = (token) => jwt.verify(token, getSecret(), { algorithms: [ALGORITHM] });

module.exports = { signToken, verifyToken, assertTokenConfig };
