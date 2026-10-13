const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Visit = require('../models/Visit');
const SecurityEvent = require('../models/SecurityEvent');
const HttpError = require('../utils/httpError');
const { hashPassword } = require('../utils/password');
const { toPublicUser } = require('../utils/publicUser');
const { sendCredentialsEmail } = require('../services/emailService');
const { ROLES, STATUSES } = require('../constants/roles');
const { VISIT_STATUSES } = require('../constants/visits');

const listUsers = async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).limit(200);
  res.json({ users: users.map(toPublicUser) });
};

// Counts per role and status, plus the newest accounts, for the admin dashboard.
const getStats = async (req, res) => {
  const roles = [ROLES.VISITOR, ROLES.HOST, ROLES.SECURITY];
  const statuses = [STATUSES.ACTIVE, STATUSES.INACTIVE];
  const counts = await Promise.all(
    roles.flatMap((role) => statuses.map((status) => User.countDocuments({ role, status })))
  );
  const stats = {};
  roles.forEach((role, i) => {
    const active = counts[i * 2];
    const blocked = counts[i * 2 + 1];
    stats[role] = { total: active + blocked, active, blocked };
  });
  const recent = await User.find().sort({ createdAt: -1 }).limit(5);
  const insideNow = await Visit.countDocuments({ status: VISIT_STATUSES.INSIDE });
  res.json({ stats, insideNow, recent: recent.map(toPublicUser) });
};

// 12 random characters (about 69 bits) from an alphabet without look-alikes (no 0/O, 1/l/I),
// so the admin can read it out or copy it without mistakes.
const TEMP_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generateTempPassword = () =>
  Array.from({ length: 12 }, () => TEMP_ALPHABET[crypto.randomInt(TEMP_ALPHABET.length)]).join('');

const issueCredentials = (user, tempPassword) =>
  sendCredentialsEmail({ to: user.email, name: user.name, role: user.role, tempPassword });

// Emails for students uploaded without one: roll number based, so it is unique and easy to remember.
const emailFromRollNo = (rollNo) => `${rollNo.toLowerCase().replace(/[^a-z0-9._-]/g, '')}@student.local`;

// Admin-only: creates a Student/Teacher/Security (or Admin) account with an emailed temporary password.
const createUser = async (req, res) => {
  const { name, role, className, year, rollNo } = req.body;
  const isStudent = role === ROLES.VISITOR;
  // Students may be added without an email: the login email is then derived from the roll number.
  const email = req.body.email || emailFromRollNo(rollNo);

  if (await User.exists({ email })) throw new HttpError(409, 'Email is already registered');

  const tempPassword = generateTempPassword();
  let user;
  try {
    user = await User.create({
      name,
      email,
      ...(isStudent && { className, year, rollNo }),
      passwordHash: await hashPassword(tempPassword),
      role,
      status: STATUSES.ACTIVE,
      mustChangePassword: true,
    });
  } catch (err) {
    if (err && err.code === 11000) throw new HttpError(409, 'Email is already registered');
    throw err;
  }

  const emailStatus = await issueCredentials(user, tempPassword);
  // The admin sees the temporary password once, here, so they can hand it over directly.
  res.status(201).json({ user: toPublicUser(user), tempPassword, emailStatus });
};

// Generates a fresh temporary password and emails it (also the retry path if the first email failed).
const resendCredentials = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid user id');

  const tempPassword = generateTempPassword();
  const user = await User.findByIdAndUpdate(
    id,
    { passwordHash: await hashPassword(tempPassword), mustChangePassword: true },
    { new: true }
  );
  if (!user) throw new HttpError(404, 'User not found');

  const emailStatus = await issueCredentials(user, tempPassword);
  res.json({ user: toPublicUser(user), tempPassword, emailStatus });
};

// Admin-only: creates many students at once (from a parsed CSV). Each row succeeds or fails on its own.
const bulkCreateStudents = async (req, res) => {
  const results = [];
  const seen = new Set();

  const createRow = async (row) => {
    const email = row.email || emailFromRollNo(row.rollNo);
    const base = { name: row.name, className: row.className, year: row.year, rollNo: row.rollNo, email };
    if (seen.has(email)) return { ...base, status: 'skipped', reason: 'Duplicate row in the file' };
    seen.add(email);
    if (await User.exists({ email })) return { ...base, status: 'skipped', reason: 'Already registered' };

    const tempPassword = generateTempPassword();
    try {
      await User.create({
        name: row.name,
        email,
        className: row.className,
        year: row.year,
        rollNo: row.rollNo,
        passwordHash: await hashPassword(tempPassword),
        role: ROLES.VISITOR,
        status: STATUSES.ACTIVE,
        mustChangePassword: true,
      });
    } catch (err) {
      if (err && err.code === 11000) return { ...base, status: 'skipped', reason: 'Already registered' };
      throw err;
    }
    return { ...base, status: 'created', tempPassword };
  };

  // A few at a time: bcrypt is deliberately slow, but runs on a thread pool.
  const rows = req.body.students;
  for (let i = 0; i < rows.length; i += 5) {
    results.push(...(await Promise.all(rows.slice(i, i + 5).map(createRow))));
  }

  const created = results.filter((r) => r.status === 'created').length;
  res.status(201).json({ created, skipped: results.length - created, results });
};

const setUserStatus = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid user id');
  if (String(req.user._id) === id) throw new HttpError(400, 'You cannot change your own status');

  const user = await User.findByIdAndUpdate(id, { status: req.body.status }, { new: true });
  if (!user) throw new HttpError(404, 'User not found');
  // A fresh start: earlier black marks stay in the history but stop counting toward the limit.
  if (req.body.status === STATUSES.ACTIVE) {
    await SecurityEvent.updateMany({ student: user._id, type: 'black_mark', cleared: false }, { cleared: true });
  }
  res.json({ user: toPublicUser(user) });
};

module.exports = { listUsers, getStats, createUser, bulkCreateStudents, resendCredentials, setUserStatus };
