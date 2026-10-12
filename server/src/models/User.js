const mongoose = require('mongoose');
const { ROLES, ROLE_VALUES, STATUSES, STATUS_VALUES } = require('../constants/roles');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true, // creates a unique index, which is what really prevents duplicate emails
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    // Only the bcrypt hash is stored. "select: false" keeps it out of normal queries;
    // the login code must ask for it explicitly with .select('+passwordHash').
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLE_VALUES, default: ROLES.VISITOR, required: true },
    status: { type: String, enum: STATUS_VALUES, default: STATUSES.ACTIVE, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      // Defense in depth: even if a document is serialized by accident, no hash leaks.
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);
