const mongoose = require('mongoose');
const User = require('../models/User');
const HttpError = require('../utils/httpError');
const { hashPassword } = require('../utils/password');
const { toPublicUser } = require('../utils/publicUser');
const { STATUSES } = require('../constants/roles');

const listUsers = async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).limit(200);
  res.json({ users: users.map(toPublicUser) });
};

// Admin-only: the one way to create Host, Security or extra Admin accounts.
const createUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (await User.exists({ email })) throw new HttpError(409, 'Email is already registered');

  try {
    const user = await User.create({
      name,
      email,
      passwordHash: await hashPassword(password),
      role,
      status: STATUSES.ACTIVE,
    });
    res.status(201).json({ user: toPublicUser(user) });
  } catch (err) {
    if (err && err.code === 11000) throw new HttpError(409, 'Email is already registered');
    throw err;
  }
};

const setUserStatus = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid user id');
  if (String(req.user._id) === id) throw new HttpError(400, 'You cannot change your own status');

  const user = await User.findByIdAndUpdate(id, { status: req.body.status }, { new: true });
  if (!user) throw new HttpError(404, 'User not found');
  res.json({ user: toPublicUser(user) });
};

module.exports = { listUsers, createUser, setUserStatus };
