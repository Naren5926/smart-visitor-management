const User = require('../models/User');
const HttpError = require('../utils/httpError');
const { hashPassword, verifyPassword, getDummyHash } = require('../utils/password');
const { signToken } = require('../utils/token');
const { toPublicUser } = require('../utils/publicUser');
const { ROLES, STATUSES } = require('../constants/roles');

const isDuplicateKey = (err) => err && err.code === 11000;

// Public sign-up. The role is hard-coded to visitor; the schema also rejects a "role" field.
const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (await User.exists({ email })) throw new HttpError(409, 'Email is already registered');

  try {
    const user = await User.create({
      name,
      email,
      passwordHash: await hashPassword(password),
      role: ROLES.VISITOR,
      status: STATUSES.ACTIVE,
    });
    res.status(201).json({ user: toPublicUser(user) });
  } catch (err) {
    // Two sign-ups racing past the check above are still stopped by the unique index.
    if (isDuplicateKey(err)) throw new HttpError(409, 'Email is already registered');
    throw err;
  }
};

const INVALID_LOGIN = 'Invalid email or password';

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  // Always run one bcrypt comparison, and give the same error for "no such user" and "wrong password".
  const passwordOk = await verifyPassword(password, user ? user.passwordHash : await getDummyHash());
  if (!user || !passwordOk) throw new HttpError(401, INVALID_LOGIN);

  // Only revealed after the correct password, so it cannot be used to probe for accounts.
  if (user.status !== STATUSES.ACTIVE) throw new HttpError(403, 'Account is inactive');

  res.json({ token: signToken(user._id), user: toPublicUser(user) });
};

const me = (req, res) => {
  res.json({ user: toPublicUser(req.user) });
};

// Lets any logged-in user pick a new password; this also clears the "temporary password" flag.
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user) throw new HttpError(401, 'Authentication required');

  // Someone who has just signed in with an admin-issued temporary password does not have to type it
  // again; everyone else must prove they know the current password.
  if (!user.mustChangePassword) {
    if (!currentPassword || !(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new HttpError(401, 'Current password is incorrect');
    }
  }

  const updated = await User.findByIdAndUpdate(
    user._id,
    { passwordHash: await hashPassword(newPassword), mustChangePassword: false },
    { new: true }
  );
  res.json({ user: toPublicUser(updated) });
};

module.exports = { register, login, me, changePassword };
