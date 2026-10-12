const request = require('supertest');
const mongoose = require('mongoose');

jest.mock('../src/models/User', () => require('./helpers/fakeUserModel'));

const app = require('../src/app');
const User = require('../src/models/User');
jest.mock('../src/services/emailService', () => ({ sendCredentialsEmail: jest.fn().mockResolvedValue('sent') }));
const { sendCredentialsEmail } = require('../src/services/emailService');
const { PASSWORD, fakeDbConnected, makeUser, tokenFor } = require('./helpers/testUtils');

beforeEach(() => {
  sendCredentialsEmail.mockClear();
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
      .send({ name: 'Evil Admin', email: 'evil@example.com', role: 'admin' });
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
        .send({ name: 'Staff Member', email: `${role}-new@example.com`, role });
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
      .send({ name: 'Someone', email: 's@example.com', role: 'superuser' });
    expect(badRole.status).toBe(400);
    const dup = await request(app)
      .post('/api/users')
      .set('Authorization', auth)
      .send({ name: 'Someone', email: 'admin@example.com', role: 'host' });
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

describe('temporary passwords, stats and change-password', () => {
  it('shows the admin a temp password (stored only hashed) and the user must change it on first login', async () => {
    const { auth } = await as('admin');
    const res = await request(app).post('/api/users').set('Authorization', auth).send({ name: 'New Teacher', email: 'new@example.com', role: 'host' });
    expect(res.status).toBe(201);
    expect(res.body.emailStatus).toBe('sent');
    expect(res.body.user.mustChangePassword).toBe(true);
    const { tempPassword } = res.body;
    expect(tempPassword).toHaveLength(12);
    expect(sendCredentialsEmail.mock.calls[0][0].tempPassword).toBe(tempPassword);
    expect(JSON.stringify(User.__all())).not.toContain(tempPassword); // only the hash is stored

    const login = await request(app).post('/api/auth/login').send({ email: 'new@example.com', password: tempPassword });
    expect(login.status).toBe(200);
    expect(login.body.user.mustChangePassword).toBe(true);

    // No current password needed right after signing in with the temp password
    const change = await request(app).post('/api/auth/change-password').set('Authorization', `Bearer ${login.body.token}`).send({ newPassword: 'a-brand-new-password' });
    expect(change.status).toBe(200);
    expect(change.body.user.mustChangePassword).toBe(false);
    const again = await request(app).post('/api/auth/login').send({ email: 'new@example.com', password: 'a-brand-new-password' });
    expect(again.status).toBe(200);
  });

  it('rejects a wrong current password and a weak new password', async () => {
    const { auth } = await as('visitor');
    const wrong = await request(app).post('/api/auth/change-password').set('Authorization', auth).send({ currentPassword: 'nope-nope-nope', newPassword: 'a-brand-new-password' });
    expect(wrong.status).toBe(401);
    const weak = await request(app).post('/api/auth/change-password').set('Authorization', auth).send({ currentPassword: PASSWORD, newPassword: 'short' });
    expect(weak.status).toBe(400);
  });

  it('resends credentials with a fresh password', async () => {
    const { auth } = await as('admin');
    const target = await makeUser({ email: 'target@example.com' });
    const res = await request(app).post(`/api/users/${target._id}/resend-credentials`).set('Authorization', auth);
    expect(res.status).toBe(200);
    const { tempPassword } = res.body;
    const login = await request(app).post('/api/auth/login').send({ email: 'target@example.com', password: tempPassword });
    expect(login.status).toBe(200);
  });

  it('returns counts per role for the dashboard (admin only)', async () => {
    const { auth } = await as('admin');
    await makeUser({ role: 'visitor' });
    await makeUser({ role: 'visitor', status: 'inactive' });
    await makeUser({ role: 'host' });
    const res = await request(app).get('/api/users/stats').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.stats.visitor).toEqual({ total: 2, active: 1, blocked: 1 });
    expect(res.body.stats.host.total).toBe(1);
    expect(res.body.stats.security.total).toBe(0);
    expect(res.body.recent.length).toBeGreaterThan(0);

    const { auth: studentAuth } = await as('visitor');
    expect((await request(app).get('/api/users/stats').set('Authorization', studentAuth)).status).toBe(403);
  });
});

describe('bulk student upload', () => {
  it('creates students with unique temp passwords and skips duplicates', async () => {
    const { auth } = await as('admin');
    await makeUser({ email: 'r102@student.local' });
    const res = await request(app).post('/api/users/bulk').set('Authorization', auth).send({
      students: [
        { name: 'Asha K', className: 'CSE-A', year: '3', rollNo: 'R101' },
        { name: 'Ravi P', className: 'CSE-A', year: '3', rollNo: 'R102' },
        { name: 'Asha Again', className: 'CSE-A', year: '3', rollNo: 'R101' },
        { name: 'Mei L', className: 'ECE', year: '2', rollNo: 'R103', email: 'mei@example.com' },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.created).toBe(2);
    expect(res.body.skipped).toBe(2);
    const created = res.body.results.filter((r) => r.status === 'created');
    expect(created.map((r) => r.email).sort()).toEqual(['mei@example.com', 'r101@student.local']);
    expect(new Set(created.map((r) => r.tempPassword)).size).toBe(2);
    const stored = User.__all().find((u) => u.email === 'r101@student.local');
    expect(stored).toMatchObject({ role: 'visitor', className: 'CSE-A', year: '3', rollNo: 'R101', mustChangePassword: true });

    const row = created.find((r) => r.email === 'r101@student.local');
    const login = await request(app).post('/api/auth/login').send({ email: row.email, password: row.tempPassword });
    expect(login.status).toBe(200);
  });

  it('validates rows, caps the size and is admin only', async () => {
    const { auth } = await as('admin');
    const bad = await request(app).post('/api/users/bulk').set('Authorization', auth).send({ students: [{ name: 'Xy', className: '', year: '1', rollNo: '1' }] });
    expect(bad.status).toBe(400);
    const empty = await request(app).post('/api/users/bulk').set('Authorization', auth).send({ students: [] });
    expect(empty.status).toBe(400);
    const { auth: studentAuth } = await as('visitor');
    const forbidden = await request(app).post('/api/users/bulk').set('Authorization', studentAuth).send({ students: [] });
    expect(forbidden.status).toBe(403);
  });
});

describe('adding a single student', () => {
  it('stores class, year and roll no and derives the login email when none is given', async () => {
    const { auth } = await as('admin');
    const res = await request(app).post('/api/users').set('Authorization', auth).send({ name: 'Asha K', role: 'visitor', className: 'CSE-A', year: '3', rollNo: '21CS001' });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: '21cs001@student.local', className: 'CSE-A', year: '3', rollNo: '21CS001', role: 'visitor' });
    const login = await request(app).post('/api/auth/login').send({ email: '21cs001@student.local', password: res.body.tempPassword });
    expect(login.status).toBe(200);
  });

  it('uses the given email, and requires student details and non-student emails', async () => {
    const { auth } = await as('admin');
    const withEmail = await request(app).post('/api/users').set('Authorization', auth).send({ name: 'Mei L', role: 'visitor', className: 'ECE', year: '2', rollNo: 'E5', email: 'mei@example.com' });
    expect(withEmail.body.user.email).toBe('mei@example.com');
    const noDetails = await request(app).post('/api/users').set('Authorization', auth).send({ name: 'No Details', role: 'visitor', email: 'nd@example.com' });
    expect(noDetails.status).toBe(400);
    const teacherNoEmail = await request(app).post('/api/users').set('Authorization', auth).send({ name: 'Teacher T', role: 'host' });
    expect(teacherNoEmail.status).toBe(400);
  });

  it('still requires the current password for users who are not on a temp password', async () => {
    const { auth } = await as('visitor');
    const res = await request(app).post('/api/auth/change-password').set('Authorization', auth).send({ newPassword: 'a-brand-new-password' });
    expect(res.status).toBe(401);
  });
});
