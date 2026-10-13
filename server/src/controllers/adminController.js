const mongoose = require('mongoose');
const TeacherBlock = require('../models/TeacherBlock');
const User = require('../models/User');
const SecurityEvent = require('../models/SecurityEvent');
const { STATUSES } = require('../constants/roles');
const { BLACK_MARK_LIMIT } = require('../constants/visits');
const HttpError = require('../utils/httpError');
const { toPublicBlock } = require('../utils/publicVisit');

// Every block a teacher has made, with the reason they gave.
const blockLogs = async (req, res) => {
  const blocks = await TeacherBlock.find().sort({ createdAt: -1 }).limit(200);
  res.json({ blocks: blocks.map(toPublicBlock) });
};

const liftBlock = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid block id');
  const block = await TeacherBlock.findOneAndUpdate(
    { _id: id, active: true },
    { active: false, liftedAt: new Date(), liftedBy: req.user._id },
    { new: true }
  );
  if (!block) throw new HttpError(404, 'No active block found');
  res.json({ block: toPublicBlock(block) });
};

// Notifications: black marks and automatic blocks, newest first. Each says whether the student is
// still blocked right now.
const blackMarks = async (req, res) => {
  const events = await SecurityEvent.find().sort({ createdAt: -1 }).limit(300);
  const studentIds = [...new Set(events.map((e) => String(e.student)))];
  const students = await User.find({ _id: { $in: studentIds } }).select('status');
  const status = new Map(students.map((u) => [String(u._id), u.status]));
  res.json({
    limit: BLACK_MARK_LIMIT,
    events: events.map((e) => ({
      id: String(e._id),
      type: e.type,
      student: { id: String(e.student), name: e.studentName, className: e.className, rollNo: e.rollNo },
      teacher: e.teacher ? { id: String(e.teacher), name: e.teacherName } : null,
      reason: e.reason,
      markCount: e.markCount,
      cleared: e.cleared,
      stillBlocked: status.get(String(e.student)) === STATUSES.INACTIVE,
      createdAt: e.createdAt,
    })),
  });
};

module.exports = { blockLogs, liftBlock, blackMarks };
