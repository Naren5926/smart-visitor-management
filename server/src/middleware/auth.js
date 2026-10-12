const mongoose = require('mongoose');
const User = require('../models/User');
const HttpError = require('../utils/httpError');
const { verifyToken } = require('../utils/token');
const { STATUSES } = require('../constants/roles');

// Reads "Authorization: Bearer <token>", verifies it, loads the user, and sets req.user.
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'Authentication required');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }

  if (!mongoose.isValidObjectId(payload.sub)) {
    throw new HttpError(401, 'Invalid or expired token');
  }

  // Always load the user fresh: deleted, deactivated or re-roled accounts are caught here.
  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, 'Invalid or expired token');
  if (user.status !== STATUSES.ACTIVE) throw new HttpError(403, 'Account is inactive');

  req.user = user;
  next();
};

// Use after authenticate: authorize('admin') or authorize('admin', 'host').
const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    if (!allowedRoles.includes(req.user.role)) {
      throw new HttpError(403, 'You do not have permission to do this');
    }
    next();
  };

module.exports = { authenticate, authorize };
