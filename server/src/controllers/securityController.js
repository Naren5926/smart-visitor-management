const mongoose = require('mongoose');
const Visit = require('../models/Visit');
const HttpError = require('../utils/httpError');
const { toPublicVisit } = require('../utils/publicVisit');
const { verifyPassToken } = require('../utils/qrTokens');
const { expireStaleVisits } = require('../services/visitService');
const { PURPOSE_VALUES, VISIT_STATUSES } = require('../constants/visits');

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Who is on campus right now, and why.
const overview = async (req, res) => {
  await expireStaleVisits();
  const inside = await Visit.find({ status: VISIT_STATUSES.INSIDE }).sort({ enteredAt: 1 }).limit(500);
  const byPurpose = Object.fromEntries(PURPOSE_VALUES.map((p) => [p, 0]));
  inside.forEach((v) => {
    byPurpose[v.purpose] += 1;
  });
  const since = startOfToday();
  const [entriesToday, exitsToday] = await Promise.all([
    Visit.countDocuments({ enteredAt: { $gte: since } }),
    Visit.countDocuments({ exitedAt: { $gte: since } }),
  ]);
  res.json({
    insideCount: inside.length,
    byPurpose,
    entriesToday,
    exitsToday,
    inside: inside.map((v) => toPublicVisit(v)),
    serverTime: Date.now(),
  });
};

const whyNot = (visit) => {
  if (!visit) return 'Pass not recognised';
  switch (visit.status) {
    case VISIT_STATUSES.APPROVED:
      return 'Pass expired';
    case VISIT_STATUSES.INSIDE:
      return 'This pass was already used to enter';
    case VISIT_STATUSES.COMPLETED:
      return 'This visit is already completed';
    default:
      return `Visit is ${visit.status}`;
  }
};

// One endpoint for both gates: an ENTRY token logs entry, an EXIT token logs exit.
const scan = async (req, res) => {
  let parsed;
  try {
    parsed = verifyPassToken(req.body.token);
  } catch (err) {
    const expired = err && err.name === 'TokenExpiredError';
    throw new HttpError(400, expired ? 'This QR has expired' : 'Not a valid pass QR');
  }
  const { visitId, type } = parsed;
  if (!mongoose.isValidObjectId(visitId)) throw new HttpError(400, 'Not a valid pass QR');

  const now = new Date();
  if (type === 'entry') {
    // One atomic step: only an approved, unexpired visit can become "inside", exactly once.
    const visit = await Visit.findOneAndUpdate(
      { _id: visitId, status: VISIT_STATUSES.APPROVED, qrExpiresAt: { $gt: now } },
      { status: VISIT_STATUSES.INSIDE, enteredAt: now, checkedInBy: req.user._id },
      { new: true }
    );
    if (!visit) throw new HttpError(409, whyNot(await Visit.findById(visitId)));
    return res.json({ action: 'entry', visit: toPublicVisit(visit) });
  }

  const visit = await Visit.findOneAndUpdate(
    { _id: visitId, status: VISIT_STATUSES.INSIDE },
    { status: VISIT_STATUSES.COMPLETED, exitedAt: now, checkedOutBy: req.user._id },
    { new: true }
  );
  if (!visit) throw new HttpError(409, whyNot(await Visit.findById(visitId)));
  res.json({ action: 'exit', visit: toPublicVisit(visit) });
};

// Fallback when a student's phone is dead or the QR cannot be shown.
const checkout = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid visit id');
  const visit = await Visit.findOneAndUpdate(
    { _id: id, status: VISIT_STATUSES.INSIDE },
    { status: VISIT_STATUSES.COMPLETED, exitedAt: new Date(), checkedOutBy: req.user._id, manualCheckout: true },
    { new: true }
  );
  if (!visit) throw new HttpError(409, 'This student is not marked as inside');
  res.json({ action: 'exit', visit: toPublicVisit(visit) });
};

module.exports = { overview, scan, checkout };
