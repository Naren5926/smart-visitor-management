const Visit = require('../models/Visit');
const { VISIT_STATUSES } = require('../constants/visits');

// Marks approved visits whose entry QR timed out as "expired". Called before reads so the stored
// status catches up; no background job needed.
const expireStaleVisits = (filter = {}) =>
  Visit.updateMany(
    { ...filter, status: VISIT_STATUSES.APPROVED, qrExpiresAt: { $lte: new Date() } },
    { status: VISIT_STATUSES.EXPIRED }
  );

module.exports = { expireStaleVisits };
