const { VISIT_STATUSES } = require('../constants/visits');

// An approved visit whose entry QR has timed out is "expired", even if the database row has not been
// tidied yet (see expireStaleVisits).
const effectiveStatus = (visit, now = Date.now()) =>
  visit.status === VISIT_STATUSES.APPROVED && visit.qrExpiresAt && new Date(visit.qrExpiresAt).getTime() <= now
    ? VISIT_STATUSES.EXPIRED
    : visit.status;

// Explicit allow-list of visit fields that may leave the server.
const toPublicVisit = (v) => ({
  id: String(v._id),
  status: effectiveStatus(v),
  purpose: v.purpose,
  reason: v.reason,
  student: { id: String(v.student), name: v.studentName, className: v.className, rollNo: v.rollNo },
  teacher: v.teacher ? { id: String(v.teacher), name: v.teacherName } : null,
  decisionNote: v.decisionNote,
  decidedAt: v.decidedAt,
  qrExpiresAt: v.qrExpiresAt,
  enteredAt: v.enteredAt,
  arrivedAt: v.arrivedAt,
  exitedAt: v.exitedAt,
  createdAt: v.createdAt,
});

const toPublicBlock = (b) => ({
  id: String(b._id),
  teacher: { id: String(b.teacher), name: b.teacherName },
  student: { id: String(b.student), name: b.studentName, className: b.className, rollNo: b.rollNo },
  reason: b.reason,
  active: b.active,
  createdAt: b.createdAt,
  liftedAt: b.liftedAt,
});

module.exports = { effectiveStatus, toPublicVisit, toPublicBlock };
