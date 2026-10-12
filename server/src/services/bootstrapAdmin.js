const User = require('../models/User');
const { hashPassword } = require('../utils/password');
const { name, email, password } = require('../validators/schemas');
const { z } = require('zod');
const { ROLES, STATUSES } = require('../constants/roles');

const adminSchema = z.object({ name, email, password });

// Creates the very first Admin. Refuses if any Admin already exists, so it cannot be
// used later as a backdoor to add more admins (use the admin-only API for that).
const createFirstAdmin = async (input) => {
  const parsed = adminSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  }

  if (await User.exists({ role: ROLES.ADMIN })) {
    throw new Error('An admin account already exists. Refusing to create another.');
  }

  const { name: n, email: e, password: p } = parsed.data;
  return User.create({
    name: n,
    email: e,
    passwordHash: await hashPassword(p),
    role: ROLES.ADMIN,
    status: STATUSES.ACTIVE,
  });
};

module.exports = { createFirstAdmin };
