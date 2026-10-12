const request = require('supertest');

jest.mock('../src/models/User', () => require('./helpers/fakeUserModel'));
jest.mock('../src/models/Visit', () => require('./helpers/fakeVisitModel'));
jest.mock('../src/models/TeacherBlock', () => require('./helpers/fakeBlockModel'));

const app = require('../src/app');
const User = require('../src/models/User');
const Visit = require('../src/models/Visit');
const TeacherBlock = require('../src/models/TeacherBlock');
const { fakeDbConnected, makeUser, tokenFor } = require('./helpers/testUtils');
const { makeLiveCode } = require('../src/utils/qrTokens');

beforeEach(() => {
  User.__reset();
  Visit.__reset();
  TeacherBlock.__reset();
  fakeDbConnected(true);
});
afterEach(() => jest.restoreAllMocks());

const login = async (role, extra = {}) => {
  const user = await makeUser({ role, email: `${role}${Math.random().toString(36).slice(2)}@example.com`, ...extra });
  return { user, auth: `Bearer ${tokenFor(user)}` };
};
const api = (method, path, auth) => request(app)[method](path).set('Authorization', auth);

const setup = async () => {
  const student = await login('visitor', { name: 'Asha K', className: 'CSE-A', rollNo: '21CS001' });
  const teacher = await login('host', { name: 'Mr Rao' });
  const security = await login('security');
  const admin = await login('admin');
  return { student, teacher, security, admin };
};

const requestStaffVisit = (s, t, reason = 'Doubt in algorithms') =>
  api('post', '/api/visits', s.auth).send({ purpose: 'staff', teacherId: String(t.user._id), reason });

describe('creating visits', () => {
  it('auto-approves library and lab visits with a 5 minute QR window', async () => {
    const { student } = await setup();
    const res = await api('post', '/api/visits', student.auth).send({ purpose: 'library' });
    expect(res.status).toBe(201);
    expect(res.body.visit.status).toBe('approved');
    const ttl = new Date(res.body.visit.qrExpiresAt).getTime() - res.body.serverTime;
    expect(ttl).toBe(5 * 60 * 1000);
  });

  it('puts a staff visit in pending and needs a teacher and a reason', async () => {
    const { student, teacher } = await setup();
    const noTeacher = await api('post', '/api/visits', student.auth).send({ purpose: 'staff', reason: 'Doubt' });
    expect(noTeacher.status).toBe(400);
    const noReason = await api('post', '/api/visits', student.auth).send({ purpose: 'staff', teacherId: String(teacher.user._id) });
    expect(noReason.status).toBe(400);
    const ok = await requestStaffVisit(student, teacher);
    expect(ok.status).toBe(201);
    expect(ok.body.visit).toMatchObject({ status: 'pending', teacher: { name: 'Mr Rao' }, student: { rollNo: '21CS001' } });
  });

  it('allows only one open visit at a time', async () => {
    const { student } = await setup();
    await api('post', '/api/visits', student.auth).send({ purpose: 'library' });
    const second = await api('post', '/api/visits', student.auth).send({ purpose: 'lab' });
    expect(second.status).toBe(409);
  });

  it('is for students only, and teachers list only shows active teachers', async () => {
    const { teacher, security, student } = await setup();
    await login('host', { name: 'Blocked Teacher', status: 'inactive' });
    expect((await api('post', '/api/visits', teacher.auth).send({ purpose: 'library' })).status).toBe(403);
    expect((await api('get', '/api/visits/mine', security.auth)).status).toBe(403);
    const list = await api('get', '/api/visits/teachers', student.auth);
    expect(list.body.teachers.map((t) => t.name)).toEqual(['Mr Rao']);
  });
});

describe('teacher decisions', () => {
  it('lets the addressed teacher approve, which starts the 5 minute QR window', async () => {
    const { student, teacher } = await setup();
    const { body } = await requestStaffVisit(student, teacher);
    const res = await api('post', `/api/visits/${body.visit.id}/decision`, teacher.auth).send({ decision: 'approve' });
    expect(res.status).toBe(200);
    expect(res.body.visit.status).toBe('approved');
    expect(res.body.visit.qrExpiresAt).toBeTruthy();
  });

  it('lets a teacher reject, and stops other teachers deciding', async () => {
    const { student, teacher } = await setup();
    const other = await login('host', { name: 'Ms Other' });
    const { body } = await requestStaffVisit(student, teacher);
    const stranger = await api('post', `/api/visits/${body.visit.id}/decision`, other.auth).send({ decision: 'approve' });
    expect(stranger.status).toBe(404);
    const rejected = await api('post', `/api/visits/${body.visit.id}/decision`, teacher.auth).send({ decision: 'reject', note: 'Busy' });
    expect(rejected.body.visit).toMatchObject({ status: 'rejected', decisionNote: 'Busy' });
    const again = await api('post', `/api/visits/${body.visit.id}/decision`, teacher.auth).send({ decision: 'approve' });
    expect(again.status).toBe(404);
  });

  it('shows a teacher only their own requests', async () => {
    const { student, teacher } = await setup();
    const other = await login('host', { name: 'Ms Other' });
    await requestStaffVisit(student, teacher);
    expect((await api('get', '/api/teacher/requests', teacher.auth)).body.visits).toHaveLength(1);
    expect((await api('get', '/api/teacher/requests', other.auth)).body.visits).toHaveLength(0);
  });
});

describe('gate scanning', () => {
  const approvedVisit = async (s) => {
    const created = await api('post', '/api/visits', s.student.auth).send({ purpose: 'library' });
    const pass = await api('get', `/api/visits/${created.body.visit.id}/pass`, s.student.auth);
    return { id: created.body.visit.id, pass };
  };

  it('logs entry once, then rejects reuse of the same QR', async () => {
    const s = await setup();
    const { pass } = await approvedVisit(s);
    expect(pass.body.type).toBe('entry');

    const first = await api('post', '/api/security/scan', s.security.auth).send({ token: pass.body.token });
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ action: 'entry', visit: { status: 'inside' } });

    const second = await api('post', '/api/security/scan', s.security.auth).send({ token: pass.body.token });
    expect(second.status).toBe(409);
    expect(second.body.message).toMatch(/already used/i);
  });

  it('rejects an entry QR after its 5 minutes are up', async () => {
    const s = await setup();
    const { id, pass } = await approvedVisit(s);
    Visit.__set(id, { qrExpiresAt: new Date(Date.now() - 1000) });

    const scan = await api('post', '/api/security/scan', s.security.auth).send({ token: pass.body.token });
    expect(scan.status).toBe(409);
    expect(scan.body.message).toMatch(/expired/i);
    const again = await api('get', `/api/visits/${id}/pass`, s.student.auth);
    expect(again.status).toBe(409);
    const mine = await api('get', '/api/visits/mine', s.student.auth);
    expect(mine.body.visits[0].status).toBe('expired');
  });

  it('rejects garbage, login tokens and non-security users', async () => {
    const s = await setup();
    const { pass } = await approvedVisit(s);
    const garbage = await api('post', '/api/security/scan', s.security.auth).send({ token: 'not-a-token' });
    expect(garbage.status).toBe(400);
    const loginJwt = tokenFor(s.student.user);
    const replay = await api('post', '/api/security/scan', s.security.auth).send({ token: loginJwt });
    expect(replay.status).toBe(400);
    const byStudent = await api('post', '/api/security/scan', s.student.auth).send({ token: pass.body.token });
    expect(byStudent.status).toBe(403);
  });

  it('tracks who is inside, then logs exit with an exit QR', async () => {
    const s = await setup();
    const { id, pass } = await approvedVisit(s);
    await api('post', '/api/security/scan', s.security.auth).send({ token: pass.body.token });

    const overview = await api('get', '/api/security/overview', s.security.auth);
    expect(overview.body).toMatchObject({ insideCount: 1, byPurpose: { library: 1, lab: 0, staff: 0 }, entriesToday: 1 });
    expect(overview.body.inside[0].student.name).toBe('Asha K');
    const stats = await api('get', '/api/users/stats', s.admin.auth);
    expect(stats.body.insideNow).toBe(1);

    const exitPass = await api('get', `/api/visits/${id}/pass`, s.student.auth);
    expect(exitPass.body.type).toBe('exit');
    const exit = await api('post', '/api/security/scan', s.security.auth).send({ token: exitPass.body.token });
    expect(exit.body).toMatchObject({ action: 'exit', visit: { status: 'completed' } });
    expect((await api('get', '/api/security/overview', s.security.auth)).body.insideCount).toBe(0);
  });

  it('lets security check someone out manually', async () => {
    const s = await setup();
    const { id, pass } = await approvedVisit(s);
    await api('post', '/api/security/scan', s.security.auth).send({ token: pass.body.token });
    const res = await api('post', `/api/security/checkout/${id}`, s.security.auth);
    expect(res.body.visit.status).toBe('completed');
    expect((await api('post', `/api/security/checkout/${id}`, s.security.auth)).status).toBe(409);
  });
});

describe('teacher live QR (arrival proof)', () => {
  const insideStaffVisit = async (s) => {
    const created = await requestStaffVisit(s.student, s.teacher);
    const id = created.body.visit.id;
    await api('post', `/api/visits/${id}/decision`, s.teacher.auth).send({ decision: 'approve' });
    const pass = await api('get', `/api/visits/${id}/pass`, s.student.auth);
    await api('post', '/api/security/scan', s.security.auth).send({ token: pass.body.token });
    return id;
  };

  it('confirms arrival with the teachers current code', async () => {
    const s = await setup();
    const id = await insideStaffVisit(s);
    const live = await api('get', '/api/teacher/live-code', s.teacher.auth);
    expect(live.body.expiresIn).toBeGreaterThan(0);
    expect(live.body.expiresIn).toBeLessThanOrEqual(30);

    const res = await api('post', `/api/visits/${id}/verify-arrival`, s.student.auth).send({ code: live.body.code });
    expect(res.status).toBe(200);
    expect(res.body.visit.arrivedAt).toBeTruthy();
  });

  it('rejects an old code (older than one 30 second step), a forged code and another teachers code', async () => {
    const s = await setup();
    const id = await insideStaffVisit(s);
    const old = makeLiveCode(String(s.teacher.user._id), Date.now() - 65 * 1000);
    expect((await api('post', `/api/visits/${id}/verify-arrival`, s.student.auth).send({ code: old.code })).status).toBe(400);

    const forged = `${s.teacher.user._id}.${Math.floor(Date.now() / 30000)}.AAAAAAAAAAAAAAAAAAAAAA`;
    expect((await api('post', `/api/visits/${id}/verify-arrival`, s.student.auth).send({ code: forged })).status).toBe(400);

    const other = await login('host', { name: 'Ms Other' });
    const wrongTeacher = makeLiveCode(String(other.user._id));
    const res = await api('post', `/api/visits/${id}/verify-arrival`, s.student.auth).send({ code: wrongTeacher.code });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/different teacher/i);
  });

  it('only works while inside', async () => {
    const s = await setup();
    const created = await requestStaffVisit(s.student, s.teacher);
    const live = await api('get', '/api/teacher/live-code', s.teacher.auth);
    const res = await api('post', `/api/visits/${created.body.visit.id}/verify-arrival`, s.student.auth).send({ code: live.body.code });
    expect(res.status).toBe(409);
  });
});

describe('teacher blocks and the admin log', () => {
  it('blocks a student, cancels their pending request, and shows the reason to the admin', async () => {
    const s = await setup();
    const created = await requestStaffVisit(s.student, s.teacher);

    const block = await api('post', '/api/teacher/blocks', s.teacher.auth).send({ studentId: String(s.student.user._id), reason: 'Disturbs class repeatedly' });
    expect(block.status).toBe(201);
    expect((await api('post', '/api/teacher/blocks', s.teacher.auth).send({ studentId: String(s.student.user._id), reason: 'Again again' })).status).toBe(409);

    const mine = await api('get', '/api/visits/mine', s.student.auth);
    expect(mine.body.visits.find((v) => v.id === created.body.visit.id).status).toBe('cancelled');

    const again = await requestStaffVisit(s.student, s.teacher);
    expect(again.status).toBe(403);
    // Library is still fine
    expect((await api('post', '/api/visits', s.student.auth).send({ purpose: 'library' })).status).toBe(201);

    const logs = await api('get', '/api/admin/block-logs', s.admin.auth);
    expect(logs.body.blocks[0]).toMatchObject({
      reason: 'Disturbs class repeatedly',
      active: true,
      teacher: { name: 'Mr Rao' },
      student: { name: 'Asha K', rollNo: '21CS001' },
    });
  });

  it('needs a real reason, and teachers cannot lift blocks; the admin can', async () => {
    const s = await setup();
    const noReason = await api('post', '/api/teacher/blocks', s.teacher.auth).send({ studentId: String(s.student.user._id), reason: 'no' });
    expect(noReason.status).toBe(400);

    await api('post', '/api/teacher/blocks', s.teacher.auth).send({ studentId: String(s.student.user._id), reason: 'Misconduct in lab' });
    const [block] = (await api('get', '/api/admin/block-logs', s.admin.auth)).body.blocks;
    expect((await api('post', `/api/admin/block-logs/${block.id}/lift`, s.teacher.auth)).status).toBe(403);
    expect((await api('post', `/api/admin/block-logs/${block.id}/lift`, s.admin.auth)).status).toBe(200);
    expect((await requestStaffVisit(s.student, s.teacher)).status).toBe(201);
  });

  it('searches students by name or roll number for the block form', async () => {
    const s = await setup();
    const res = await api('get', '/api/teacher/students?q=21cs', s.teacher.auth);
    expect(res.body.students).toEqual([{ id: String(s.student.user._id), name: 'Asha K', className: 'CSE-A', rollNo: '21CS001' }]);
    expect((await api('get', '/api/teacher/students?q=a', s.teacher.auth)).body.students).toEqual([]);
  });

  it('keeps teacher and admin endpoints away from other roles', async () => {
    const s = await setup();
    expect((await api('get', '/api/teacher/requests', s.student.auth)).status).toBe(403);
    expect((await api('get', '/api/admin/block-logs', s.teacher.auth)).status).toBe(403);
    expect((await api('get', '/api/security/overview', s.teacher.auth)).status).toBe(403);
    expect((await request(app).get('/api/visits/mine')).status).toBe(401);
  });
});
