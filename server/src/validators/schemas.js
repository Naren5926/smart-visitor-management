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
  .min(6, 'Password must be at least 6 characters')
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'Password is too long (max 72 bytes)');

// ".strict()" rejects unknown keys. That is how "role" in a public registration is refused.
const registerSchema = z.object({ name, email, password }).strict();

// The login password is not length-checked: we only compare it, never store it.
const loginSchema = z
  .object({ email, password: z.string().min(1).max(200) })
  .strict();

const shortText = (label, max) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

const studentRow = z
  .object({
    name,
    className: shortText('Class', 50),
    year: shortText('Year', 20),
    rollNo: shortText('Roll no', 50),
    // Optional: when missing, the server derives one from the roll number.
    email: z.union([email, z.literal('')]).optional(),
  })
  .strict();

const bulkStudentsSchema = z
  .object({
    students: z.array(studentRow).min(1, 'The file has no students').max(100, 'Upload at most 100 students at a time'),
  })
  .strict();

// Students need class, year and roll no (email is then optional); everyone else needs an email.
const adminCreateUserSchema = z
  .object({
    name,
    role: z.enum(ROLE_VALUES),
    email: z.union([email, z.literal('')]).optional(),
    className: shortText('Class', 50).optional(),
    year: shortText('Year', 20).optional(),
    rollNo: shortText('Roll no', 50).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.role === 'visitor') {
      for (const [key, label] of [['className', 'Class'], ['year', 'Year'], ['rollNo', 'Roll no']]) {
        if (!v[key]) ctx.addIssue({ code: 'custom', path: [key], message: `${label} is required for students` });
      }
    } else if (!v.email) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'Email is required' });
    }
  });

const statusSchema = z.object({ status: z.enum(STATUS_VALUES) }).strict();

const changePasswordSchema = z
  .object({ currentPassword: z.string().max(200).optional(), newPassword: password })
  .strict()
  .refine((v) => !v.currentPassword || v.currentPassword !== v.newPassword, {
    message: 'New password must be different from the current one',
    path: ['newPassword'],
  });

module.exports = {
  name,
  email,
  password,
  registerSchema,
  loginSchema,
  adminCreateUserSchema,
  statusSchema,
  bulkStudentsSchema,
  changePasswordSchema,
};
