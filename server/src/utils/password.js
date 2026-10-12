const bcrypt = require('bcrypt');

// Higher = slower to hash = harder to brute-force. 12 is a sensible default today.
const rounds = () => Number(process.env.BCRYPT_ROUNDS) || 12;

const hashPassword = (plain) => bcrypt.hash(plain, rounds());
const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

// Used when the email is unknown, so the response takes about as long as a real check.
// This stops attackers from discovering which emails exist by timing the login.
let dummyHashPromise;
const getDummyHash = () => {
  dummyHashPromise ??= bcrypt.hash('not-a-real-password', rounds());
  return dummyHashPromise;
};

module.exports = { hashPassword, verifyPassword, getDummyHash };
