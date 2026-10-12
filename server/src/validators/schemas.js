const { z } = require('zod');
const { ROLE_VALUES, STATUS_VALUES } = require('../constants/roles');

const name = z.string().trim().min(2, 'Name is too short').max(100, 'Name is too long');

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address').max(254));

// bcrypt silently ignores everything after 72 bytes, so we reject longer passwords instead.
const password = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'Password is too long (max 72 bytes)');

// ".strict()" rejects unknown keys. That is how "role" in a public registration is refused.
const registerSchema = z.object({ name, email, password }).strict();

// The login password is not length-checked: we only compare it, never store it.
const loginSchema = z
  .object({ email, password: z.string().min(1).max(200) })
  .strict();

const adminCreateUserSchema = z
  .object({ name, email, password, role: z.enum(ROLE_VALUES) })
  .strict();

const statusSchema = z.object({ status: z.enum(STATUS_VALUES) }).strict();

module.exports = {
  name,
  email,
  password,
  registerSchema,
  loginSchema,
  adminCreateUserSchema,
  statusSchema,
};
