const mongoose = require('mongoose');
const User = require('../models/User');
const Visit = require('../models/Visit');
const TeacherBlock = require('../models/TeacherBlock');
const HttpError = require('../utils/httpError');
const { toPublicVisit, toPublicBlock } = require('../utils/publicVisit');
const { makeLiveCode } = require('../utils/qrTokens');
const { expireStaleVisits } = require('../services/visitService');
const { ROLES, STATUSES } = require('../constants/roles');
const { VISIT_STATUSES } = require('../constants/visits');

const myRequests = async (req, res) => {
  await expireStaleVisits({ teacher: req.user._id });
  const visits = await Visit.find({ teacher: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ visits: visits.map((v) => toPublicVisit(v)), serverTime: Date.now() });
};

// The rotating QR content shown on the teacher's phone.
const liveCode = (req, res) => {
  res.json({ ...makeLiveCode(String(req.user._id)), serverTime: Date.now() });
};

// Students who actually reached this teacher (arrival confirmed by scanning the live QR).
const visitedStudentIds = (teacherId) => Visit.distinct('student', { teacher: teacherId, arrivedAt: { $ne: null } });

// Find a visited student by name, roll number or class (small campus, so a simple in-memory filter is fine).
const searchStudents = async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (q.length < 2) return res.json({ students: [] });
  const students = await User.find({
    _id: { $in: await visitedStudentIds(req.user._id) },
    role: ROLES.VISITOR,
    status: STATUSES.ACTIVE,
  }).sort({ name: 1 }).limit(2000);
  const hits = students
    .filter((s) => [s.name, s.rollNo, s.className].some((f) => f && String(f).toLowerCase().includes(q)))
    .slice(0, 20);
  res.json({
    students: hits.map((s) => ({ id: String(s._id), name: s.name, className: s.className, rollNo: s.rollNo })),
  });
};

const createBlock = async (req, res) => {
  const { studentId, reason } = req.body;
  const student = mongoose.isValidObjectId(studentId) ? await User.findById(studentId) : null;
  if (!student || student.role !== ROLES.VISITOR) throw new HttpError(404, 'Student not found');

  // A teacher may only block students who have actually visited them.
  if (!(await Visit.exists({ teacher: req.user._id, student: student._id, arrivedAt: { $ne: null } }))) {
    throw new HttpError(403, 'You can only block students who have visited you');
  }

  if (await TeacherBlock.exists({ teacher: req.user._id, student: student._id, active: true })) {
    throw new HttpError(409, 'You have already blocked this student');
  }

  const block = await TeacherBlock.create({
    teacher: req.user._id,
    teacherName: req.user.name,
    student: student._id,
    studentName: student.name,
    className: student.className,
    rollNo: student.rollNo,
    reason,
    active: true,
  });

  // Their pending or approved requests to this teacher no longer make sense.
  await Visit.updateMany(
    {
      teacher: req.user._id,
      student: student._id,
      status: { $in: [VISIT_STATUSES.PENDING, VISIT_STATUSES.APPROVED] },
    },
    { status: VISIT_STATUSES.CANCELLED, decisionNote: 'Cancelled: the teacher blocked this student' }
  );
  res.status(201).json({ block: toPublicBlock(block) });
};

const myBlocks = async (req, res) => {
  const blocks = await TeacherBlock.find({ teacher: req.user._id }).sort({ createdAt: -1 }).limit(100);
  res.json({ blocks: blocks.map(toPublicBlock) });
};

module.exports = { myRequests, liveCode, searchStudents, createBlock, myBlocks };
