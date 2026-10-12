const mongoose = require('mongoose');
const User = require('../models/User');
const Visit = require('../models/Visit');
const TeacherBlock = require('../models/TeacherBlock');
const HttpError = require('../utils/httpError');
const { toPublicVisit, effectiveStatus } = require('../utils/publicVisit');
const { signPassToken, checkLiveCode } = require('../utils/qrTokens');
const { expireStaleVisits } = require('../services/visitService');
const { ROLES, STATUSES } = require('../constants/roles');
const { PURPOSES, VISIT_STATUSES, QR_TTL_MS } = require('../constants/visits');

const OPEN_STATUSES = [VISIT_STATUSES.PENDING, VISIT_STATUSES.APPROVED, VISIT_STATUSES.INSIDE];

// Active teachers a student can pick when asking to meet a staff member.
const listTeachers = async (req, res) => {
  const teachers = await User.find({ role: ROLES.HOST, status: STATUSES.ACTIVE }).sort({ name: 1 }).limit(300);
  res.json({ teachers: teachers.map((t) => ({ id: String(t._id), name: t.name })) });
};

const createVisit = async (req, res) => {
  const { purpose, teacherId, reason } = req.body;
  const student = req.user;

  await expireStaleVisits({ student: student._id });
  if (await Visit.exists({ student: student._id, status: { $in: OPEN_STATUSES } })) {
    throw new HttpError(409, 'You already have an open visit. Finish or cancel it first.');
  }

  const now = Date.now();
  const doc = {
    student: student._id,
    studentName: student.name,
    className: student.className,
    rollNo: student.rollNo,
    purpose,
    reason,
  };

  if (purpose === PURPOSES.STAFF) {
    const teacher = mongoose.isValidObjectId(teacherId) ? await User.findById(teacherId) : null;
    if (!teacher || teacher.role !== ROLES.HOST || teacher.status !== STATUSES.ACTIVE) {
      throw new HttpError(404, 'Teacher not found');
    }
    if (await TeacherBlock.exists({ teacher: teacher._id, student: student._id, active: true })) {
      throw new HttpError(403, 'You cannot request a visit with this teacher. Please contact the admin.');
    }
    Object.assign(doc, { teacher: teacher._id, teacherName: teacher.name, status: VISIT_STATUSES.PENDING });
  } else {
    // Library and labs need no approval: the QR is issued straight away.
    Object.assign(doc, {
      status: VISIT_STATUSES.APPROVED,
      decidedAt: new Date(now),
      qrExpiresAt: new Date(now + QR_TTL_MS),
    });
  }

  const visit = await Visit.create(doc);
  res.status(201).json({ visit: toPublicVisit(visit), serverTime: now });
};

const myVisits = async (req, res) => {
  await expireStaleVisits({ student: req.user._id });
  const visits = await Visit.find({ student: req.user._id }).sort({ createdAt: -1 }).limit(30);
  res.json({ visits: visits.map((v) => toPublicVisit(v)), serverTime: Date.now() });
};

const cancelVisit = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid visit id');
  const visit = await Visit.findOneAndUpdate(
    { _id: id, student: req.user._id, status: { $in: [VISIT_STATUSES.PENDING, VISIT_STATUSES.APPROVED] } },
    { status: VISIT_STATUSES.CANCELLED },
    { new: true }
  );
  if (!visit) throw new HttpError(409, 'This visit can no longer be cancelled');
  res.json({ visit: toPublicVisit(visit) });
};

// The QR the student shows: an ENTRY pass while approved, an EXIT pass while inside.
const getPass = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid visit id');
  const visit = await Visit.findOne({ _id: id, student: req.user._id });
  if (!visit) throw new HttpError(404, 'Visit not found');

  const now = Date.now();
  const status = effectiveStatus(visit, now);

  if (status === VISIT_STATUSES.APPROVED) {
    const expiresAt = new Date(visit.qrExpiresAt).getTime();
    return res.json({ type: 'entry', token: signPassToken(visit._id, 'entry', expiresAt), expiresAt, serverTime: now });
  }
  if (status === VISIT_STATUSES.INSIDE) {
    const expiresAt = now + QR_TTL_MS;
    return res.json({ type: 'exit', token: signPassToken(visit._id, 'exit', expiresAt), expiresAt, serverTime: now });
  }
  const messages = {
    [VISIT_STATUSES.PENDING]: 'Waiting for the teacher to approve',
    [VISIT_STATUSES.EXPIRED]: 'The QR expired. Please request a new visit.',
  };
  throw new HttpError(409, messages[status] || 'No pass is available for this visit');
};

// The student scans the teacher's rotating QR to prove they actually reached the teacher.
const verifyArrival = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid visit id');
  const visit = await Visit.findOne({
    _id: id,
    student: req.user._id,
    status: VISIT_STATUSES.INSIDE,
    purpose: PURPOSES.STAFF,
  });
  if (!visit) throw new HttpError(409, 'Arrival can only be confirmed while inside, for a staff visit');

  const teacherId = checkLiveCode(req.body.code);
  if (!teacherId) throw new HttpError(400, 'That code is invalid or has expired. Scan the live QR again.');
  if (teacherId !== String(visit.teacher)) {
    throw new HttpError(400, `That QR belongs to a different teacher than ${visit.teacherName}.`);
  }

  const updated = await Visit.findOneAndUpdate(
    { _id: visit._id, status: VISIT_STATUSES.INSIDE },
    { arrivedAt: new Date() },
    { new: true }
  );
  res.json({ visit: toPublicVisit(updated) });
};

// Teacher approves or rejects a request addressed to them.
const decideVisit = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid visit id');
  const { decision, note } = req.body;

  const now = Date.now();
  const update =
    decision === 'approve'
      ? {
          status: VISIT_STATUSES.APPROVED,
          decidedAt: new Date(now),
          qrExpiresAt: new Date(now + QR_TTL_MS),
          decisionNote: note,
        }
      : { status: VISIT_STATUSES.REJECTED, decidedAt: new Date(now), decisionNote: note };

  const visit = await Visit.findOneAndUpdate(
    { _id: id, teacher: req.user._id, status: VISIT_STATUSES.PENDING },
    update,
    { new: true }
  );
  if (!visit) throw new HttpError(404, 'No pending request found');
  res.json({ visit: toPublicVisit(visit) });
};

module.exports = { listTeachers, createVisit, myVisits, cancelVisit, getPass, verifyArrival, decideVisit };
