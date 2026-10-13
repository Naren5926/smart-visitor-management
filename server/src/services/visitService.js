const User = require('../models/User');
const Visit = require('../models/Visit');
const SecurityEvent = require('../models/SecurityEvent');
const { STATUSES } = require('../constants/roles');
const { BLACK_MARK_LIMIT, PURPOSES, VISIT_STATUSES } = require('../constants/visits');

// Marks approved visits whose entry QR timed out as "expired". Called before reads so the stored
// status catches up; no background job needed.
const expireStaleVisits = (filter = {}) =>
  Visit.updateMany(
    { ...filter, status: VISIT_STATUSES.APPROVED, qrExpiresAt: { $lte: new Date() } },
    { status: VISIT_STATUSES.EXPIRED }
  );

// Called when a visit ends. A staff visit that finished without the teacher's QR ever being scanned
// earns a black mark; reaching the limit blocks the student's account automatically.
const flagUnverifiedExit = async (visit) => {
  if (visit.purpose !== PURPOSES.STAFF || visit.arrivedAt) return null;

  const who = {
    student: visit.student,
    studentName: visit.studentName,
    className: visit.className,
    rollNo: visit.rollNo,
  };
  try {
    await SecurityEvent.create({
      ...who,
      type: 'black_mark',
      visit: visit._id,
      teacher: visit.teacher,
      teacherName: visit.teacherName,
      reason: `Left after a staff visit without meeting ${visit.teacherName || 'the teacher'} (arrival never verified)`,
    });
  } catch (err) {
    if (err && err.code === 11000) return null; // this visit was already marked
    throw err;
  }
  await Visit.updateOne({ _id: visit._id }, { flagged: true });

  const markCount = await SecurityEvent.countDocuments({ student: visit.student, type: 'black_mark', cleared: false });
  await SecurityEvent.updateOne({ visit: visit._id, type: 'black_mark' }, { markCount });

  if (markCount >= BLACK_MARK_LIMIT) {
    const blocked = await User.findOneAndUpdate(
      { _id: visit.student, status: STATUSES.ACTIVE },
      { status: STATUSES.INACTIVE }
    );
    if (blocked) {
      await SecurityEvent.create({
        ...who,
        type: 'auto_block',
        markCount,
        reason: `Automatically blocked after ${markCount} black marks`,
      });
    }
  }
  return { markCount, blocked: markCount >= BLACK_MARK_LIMIT };
};

module.exports = { expireStaleVisits, flagUnverifiedExit };
