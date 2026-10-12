const mongoose = require('mongoose');
const { PURPOSE_VALUES, VISIT_STATUSES } = require('../constants/visits');

const { ObjectId } = mongoose.Schema.Types;

// Student and teacher names are copied onto the visit, so the log stays readable (and cheap to
// query) even if an account is renamed later.
const visitSchema = new mongoose.Schema(
  {
    student: { type: ObjectId, ref: 'User', required: true, index: true },
    studentName: { type: String, required: true },
    className: String,
    rollNo: String,

    purpose: { type: String, enum: PURPOSE_VALUES, required: true },
    teacher: { type: ObjectId, ref: 'User', index: true }, // only for purpose "staff"
    teacherName: String,
    reason: { type: String, trim: true, maxlength: 300 },

    status: { type: String, enum: Object.values(VISIT_STATUSES), default: VISIT_STATUSES.PENDING, index: true },
    decidedAt: Date,
    decisionNote: { type: String, trim: true, maxlength: 300 },
    qrExpiresAt: Date, // entry QR is valid until this moment

    enteredAt: Date,
    arrivedAt: Date, // student scanned the teacher's live QR
    exitedAt: Date,
    checkedInBy: { type: ObjectId, ref: 'User' },
    checkedOutBy: { type: ObjectId, ref: 'User' },
    manualCheckout: Boolean,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Visit', visitSchema);
