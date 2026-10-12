const request = require('supertest');
const mongoose = require('mongoose');

jest.mock('../src/models/User', () => require('./helpers/fakeUserModel'));

const app = require('../src/app');
const User = require('../src/models/User');
const { PASSWORD, fakeDbConnected, makeUser, tokenFor } = require('./helpers/testUtils');

beforeEach(() => {
  User.__reset();
  fakeDbConnected(true);
});
afterEach(() => jest.restoreAllMocks());

const as = async (role) => {
  const user = await makeUser({ role, email: `${role}@example.com` });
  return { user, auth: `Bearer ${tokenFor(user)}` };
};

describe('role permissions on /api/users', () => {
  it('rejects unauthenticated requests with 401', async () => {
    expect((await request(app).get('/api/users')).status).toBe(401);
    expect((await request(app).post('/api/users').send({})).status).toBe(401);
  });

  it.each(['visitor', 'host', 'security'])('forbids a %s from listing users', async (role) => {
    const { auth } = await as(role);
    const res = await request(app).get('/api/users').set('Authorization', auth);
    expect(res.status).toBe(403);
  });

  it.each(['visitor', 'host', 'security'])('forbids a %s from creating users or changing status', async (role) => {
    const { auth } = await as(role);
    const target = await makeUser({ email: 'target@example.com' });
    const create = await request(app)
      .post('/api/users')
      .set('Authorization', auth)
      .send({ name: 'Evil Admin', email: 'evil@example.com', password: PASSWORD, role: 'admin' });
    expect(create.status).toBe(403);
    const patch = await request(app)
      .patch(`/api/users/${target._id}/status`)
      .set('Authorization', auth)
      .send({ status: 'inactive' });
    expect(patch.status).toBe(403);
    expect(User.__all().some((u) => u.email === 'evil@example.com')).toBe(false);
  });

  it('lets an admin list users without any password data', async () => {
    const { auth } = await as('admin');
    await makeUser({ email: 'other@example.com' });
    const res = await request(app).get('/api/users').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });
});

describe('admin user management', () => {
  it('lets an admin create host and security accounts', async () => {
    const { auth } = await as('admin');
    for (const role of ['host', 'security']) {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', auth)
        .send({ name: 'Staff Member', email: `${role}-new@example.com`, password: PASSWORD, role });
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe(role);
    }
    const stored = User.__all().find((u) => u.email === 'host-new@example.com');
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('rejects an unknown role and duplicate emails', async () => {
    const { auth } = await as('admin');
    const badRole = await request(app)
      .post('/api/users')
      .set('Authorization', auth)
      .send({ name: 'Someone', email: 's@example.com', password: PASSWORD, role: 'superuser' });
    expect(badRole.status).toBe(400);
    const dup = await request(app)
      .post('/api/users')
      .set('Authorization', auth)
      .send({ name: 'Someone', email: 'admin@example.com', password: PASSWORD, role: 'host' });
    expect(dup.status).toBe(409);
  });

  it('lets an admin deactivate a user, who then cannot log in or use an old token', async () => {
    const { auth } = await as('admin');
    const target = await makeUser({ email: 'target@example.com' });
    const oldToken = tokenFor(target);

    const res = await request(app).patch(`/api/users/${target._id}/status`).set('Authorization', auth).send({ status: 'inactive' });
    expect(res.status).toBe(200);
    expect(res.body.user.status).toBe('inactive');

    const login = await request(app).post('/api/auth/login').send({ email: 'target@example.com', password: PASSWORD });
    expect(login.status).toBe(403);
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${oldToken}`);
    expect(me.status).toBe(403);
  });

  it('stops an admin deactivating themselves', async () => {
    const { user, auth } = await as('admin');
    const res = await request(app).patch(`/api/users/${user._id}/status`).set('Authorization', auth).send({ status: 'inactive' });
    expect(res.status).toBe(400);
  });

  it('validates the id, the status value and unknown users', async () => {
    const { auth } = await as('admin');
    const badId = await request(app).patch('/api/users/not-an-id/status').set('Authorization', auth).send({ status: 'inactive' });
    expect(badId.status).toBe(400);
    const badStatus = await request(app).patch(`/api/users/${new mongoose.Types.ObjectId()}/status`).set('Authorization', auth).send({ status: 'banned' });
    expect(badStatus.status).toBe(400);
    const missing = await request(app).patch(`/api/users/${new mongoose.Types.ObjectId()}/status`).set('Authorization', auth).send({ status: 'inactive' });
    expect(missing.status).toBe(404);
  });
});
