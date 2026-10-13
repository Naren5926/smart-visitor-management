const PURPOSES = Object.freeze({ LIBRARY: 'library', LAB: 'lab', STAFF: 'staff' });
const PURPOSE_VALUES = Object.freeze(Object.values(PURPOSES));

const VISIT_STATUSES = Object.freeze({
  PENDING: 'pending', // waiting for the teacher
  APPROVED: 'approved', // QR issued, not scanned yet
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired', // approved but the entry QR timed out unused
  INSIDE: 'inside', // entry scanned, not yet exited
  COMPLETED: 'completed', // exit scanned
});

// How long an entry QR (and an exit QR) stays valid.
const QR_TTL_MS = 5 * 60 * 1000;
// The teacher's rotating code changes every 30 seconds.
const LIVE_CODE_STEP_MS = 30 * 1000;

// A student who leaves after a staff visit without ever scanning the teacher's QR earns a black mark.
// Reaching this many uncleared marks blocks the account until an admin unblocks it.
const BLACK_MARK_LIMIT = 3;

module.exports = { BLACK_MARK_LIMIT, PURPOSES, PURPOSE_VALUES, VISIT_STATUSES, QR_TTL_MS, LIVE_CODE_STEP_MS };
