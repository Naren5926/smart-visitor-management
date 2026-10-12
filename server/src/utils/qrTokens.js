const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { LIVE_CODE_STEP_MS } = require('../constants/visits');

const ALGORITHM = 'HS256';

const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error('JWT_SECRET must be set');
  return s;
};

// Separate keys per purpose, so a login token can never be replayed as a QR token (or vice versa).
const deriveKey = (label) => crypto.createHmac('sha256', secret()).update(label).digest();

// ---- Pass QR (entry / exit): a signed token that expires at an exact moment.
const signPassToken = (visitId, type, expiresAtMs) =>
  jwt.sign({ vid: String(visitId), typ: type, exp: Math.floor(expiresAtMs / 1000) }, deriveKey('svms:pass'), {
    algorithm: ALGORITHM,
  });

// Throws jwt errors (TokenExpiredError, JsonWebTokenError) for bad or old tokens.
const verifyPassToken = (token) => {
  const payload = jwt.verify(token, deriveKey('svms:pass'), { algorithms: [ALGORITHM] });
  if (!payload.vid || !['entry', 'exit'].includes(payload.typ)) throw new jwt.JsonWebTokenError('Bad pass token');
  return { visitId: payload.vid, type: payload.typ };
};

// ---- Teacher live code: stateless, changes every 30 s. code = "<teacherId>.<step>.<mac>".
const stepOf = (nowMs) => Math.floor(nowMs / LIVE_CODE_STEP_MS);
const mac = (teacherId, step) =>
  crypto.createHmac('sha256', deriveKey(`svms:live:${teacherId}`)).update(String(step)).digest('base64url').slice(0, 22);

const makeLiveCode = (teacherId, nowMs = Date.now()) => {
  const step = stepOf(nowMs);
  return {
    code: `${teacherId}.${step}.${mac(teacherId, step)}`,
    // Seconds until this code stops being the current one (the server also accepts the previous step).
    expiresIn: Math.max(1, Math.ceil(((step + 1) * LIVE_CODE_STEP_MS - nowMs) / 1000)),
  };
};

// Returns the teacher id when the code is genuine and from the current or previous 30 s step.
const checkLiveCode = (code, nowMs = Date.now()) => {
  if (typeof code !== 'string') return null;
  const [teacherId, stepText, given] = code.split('.');
  const step = Number(stepText);
  if (!teacherId || !given || !Number.isInteger(step)) return null;

  const current = stepOf(nowMs);
  if (step !== current && step !== current - 1) return null;

  const expected = Buffer.from(mac(teacherId, step));
  const actual = Buffer.from(given);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
  return teacherId;
};

module.exports = { signPassToken, verifyPassToken, makeLiveCode, checkLiveCode };
