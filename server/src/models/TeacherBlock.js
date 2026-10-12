const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

// A teacher refusing visits from one student. This collection is also the admin's block log.
const teacherBlockSchema = new mongoose.Schema(
  {
    teacher: { type: ObjectId, ref: 'User', required: true, index: true },
    teacherName: { type: String, required: true },
    student: { type: ObjectId, ref: 'User', required: true, index: true },
    studentName: { type: String, required: true },
    className: String,
    rollNo: String,
    reason: { type: String, required: true, trim: true, minlength: 5, maxlength: 500 },
    active: { type: Boolean, default: true },
    liftedAt: Date,
    liftedBy: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TeacherBlock', teacherBlockSchema);
