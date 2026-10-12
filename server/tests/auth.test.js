const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

jest.mock('../src/models/User', () => require('./helpers/fakeUserModel'));

const app = require('../src/app');
const User = require('../src/models/User');
const { PASSWORD, fakeDbConnected, makeUser, tokenFor, expiredTokenFor } = require('./helpers/testUtils');

beforeEach(() => {
  User.__reset();
  fakeDbConnected(true);
});
afterEach(() => jest.restoreAllMocks());

const validSignup = { name: 'Alice Visitor', email: 'alice@example.com', password: PASSWORD };

describe('POST /api/auth/register', () => {
  it('creates a visitor and never returns password data', async () => {
    const res = await request(app).post('/api/auth/register').send(validSignup);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'alice@example.com', role: 'visitor', status: 'active' });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|password"|\$2[aby]\$/i);
  });

  it('stores a bcrypt hash, not the plaintext password', async () => {
    await request(app).post('/api/auth/register').send(validSignup);
    const [stored] = User.__all();
    expect(stored.passwordHash).not.toBe(PASSWORD);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(JSON.stringify(stored)).not.toContain(PASSWORD);
  });

  it.each(['admin', 'security', 'host', 'visitor'])(
    'rejects a self-assigned role "%s" and creates nothing',
    async (role) => {
      const res = await request(app).post('/api/auth/register').send({ ...validSignup, role });
      expect(res.status).toBe(400);
      expect(User.__all()).toHaveLength(0);
    }
  );

  it('rejects status and other unexpected fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validSignup, status: 'active', isAdmin: true });
    expect(res.status).toBe(400);
  });

  it('rejects duplicate emails (case-insensitive)', async () => {
    await request(app).post('/api/auth/register').send(validSignup);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validSignup, email: 'ALICE@Example.com' });
    expect(res.status).toBe(409);
  });

  it('rejects invalid email, short password and missing name', async () => {
    const bad = [
      { ...validSignup, email: 'not-an-email' },
      { ...validSignup, password: 'short' },
      { email: 'a@example.com', password: PASSWORD },
    ];
    for (const body of bad) {
      const res = await request(app).post('/api/auth/register').send(body);
      expect(res.status).toBe(400);
    }
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"name": ');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid JSON body');
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials and returns a token and safe user', async () => {
    const user = await makeUser({ email: 'bob@example.com', role: 'host' });
    const res = await request(app).post('/api/auth/login').send({ email: 'bob@example.com', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: String(user._id), email: 'bob@example.com', role: 'host' });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);

    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(payload.sub).toBe(String(user._id));
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it('treats email as case-insensitive', async () => {
    await makeUser({ email: 'bob@example.com' });
    const res = await request(app).post('/api/auth/login').send({ email: ' BOB@example.com ', password: PASSWORD });
    expect(res.status).toBe(200);
  });

  it('rejects a wrong password', async () => {
    await makeUser({ email: 'bob@example.com' });
    const res = await request(app).post('/api/auth/login').send({ email: 'bob@example.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
    expect(res.body.token).toBeUndefined();
  });

  it('gives the same error for an unknown email as for a wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ghost@example.com', password: PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('rejects missing fields', async () => {
    expect((await request(app).post('/api/auth/login').send({})).status).toBe(400);
    expect((await request(app).post('/api/auth/login').send({ email: 'a@example.com' })).status).toBe(400);
  });

  it('rejects NoSQL operator injection in the email field', async () => {
    await makeUser({ email: 'bob@example.com' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.token).toBeUndefined();
  });

  it('blocks an inactive account that uses the right password', async () => {
    await makeUser({ email: 'old@example.com', status: 'inactive' });
    const res = await request(app).post('/api/auth/login').send({ email: 'old@example.com', password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Account is inactive');
    expect(res.body.token).toBeUndefined();
  });

  it('does not reveal an inactive account to someone with the wrong password', async () => {
    await makeUser({ email: 'old@example.com', status: 'inactive' });
    const res = await request(app).post('/api/auth/login').send({ email: 'old@example.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the profile for a valid token', async () => {
    const user = await makeUser({ email: 'me@example.com', role: 'security' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenFor(user)}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: 'me@example.com', role: 'security' });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it('rejects a missing token', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });

  it('rejects a wrong auth scheme and an empty bearer', async () => {
    expect((await request(app).get('/api/auth/me').set('Authorization', 'Basic abc')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Authorization', 'Bearer')).status).toBe(401);
  });

  it('rejects garbage, wrong-secret, expired and unsigned ("alg: none") tokens', async () => {
    const user = await makeUser();
    const wrongSecret = jwt.sign({ sub: String(user._id) }, 'a-different-secret-a-different-secret!');
    const unsigned = jwt.sign({ sub: String(user._id) }, '', { algorithm: 'none' });
    for (const token of ['garbage', wrongSecret, expiredTokenFor(user), unsigned]) {
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    }
  });

  it('rejects a token whose subject is not a valid id', async () => {
    const token = jwt.sign({ sub: { $ne: null } }, process.env.JWT_SECRET, { algorithm: 'HS256' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('rejects a valid token whose user no longer exists', async () => {
    const token = jwt.sign({ sub: String(new mongoose.Types.ObjectId()) }, process.env.JWT_SECRET, { algorithm: 'HS256' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('blocks a token whose account was deactivated after login', async () => {
    const user = await makeUser();
    const token = tokenFor(user);
    await User.findByIdAndUpdate(user._id, { status: 'inactive' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe('database availability', () => {
  it('answers 503 on auth routes when MongoDB is not connected, but health still works', async () => {
    fakeDbConnected(false);
    const login = await request(app).post('/api/auth/login').send({ email: 'a@example.com', password: PASSWORD });
    expect(login.status).toBe(503);
    expect((await request(app).get('/api/health')).status).toBe(200);
  });
});
