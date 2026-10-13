const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

// Admin-facing notifications about students: a black mark (left a staff visit without meeting the
// teacher) or an automatic block (too many black marks). Names are copied so the history stays readable.
const securityEventSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['black_mark', 'auto_block'], required: true, index: true },
    student: { type: ObjectId, ref: 'User', required: true, index: true },
    studentName: { type: String, required: true },
    className: String,
    rollNo: String,
    visit: { type: ObjectId, ref: 'Visit' },
    teacher: { type: ObjectId, ref: 'User' },
    teacherName: String,
    reason: { type: String, required: true },
    markCount: Number, // uncleared marks right after this event
    cleared: { type: Boolean, default: false }, // marks stop counting once the admin unblocks the student
  },
  { timestamps: true }
);

// A visit can earn at most one black mark.
securityEventSchema.index({ visit: 1 }, { unique: true, partialFilterExpression: { type: 'black_mark' } });

module.exports = mongoose.model('SecurityEvent', securityEventSchema);
