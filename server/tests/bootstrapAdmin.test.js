jest.mock('../src/models/User', () => require('./helpers/fakeUserModel'));

const User = require('../src/models/User');
const { createFirstAdmin } = require('../src/services/bootstrapAdmin');
const { PASSWORD, makeUser } = require('./helpers/testUtils');

beforeEach(() => User.__reset());

const input = { name: 'First Admin', email: 'Admin@Example.com', password: PASSWORD };

describe('createFirstAdmin', () => {
  it('creates an active admin with a hashed password and normalized email', async () => {
    await createFirstAdmin(input);
    const [admin] = User.__all();
    expect(admin).toMatchObject({ email: 'admin@example.com', role: 'admin', status: 'active' });
    expect(admin.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(admin.passwordHash).not.toContain(PASSWORD);
  });

  it('refuses to create another admin once one exists', async () => {
    await makeUser({ role: 'admin' });
    await expect(createFirstAdmin(input)).rejects.toThrow(/already exists/);
    expect(User.__all()).toHaveLength(1);
  });

  it('rejects a weak password or invalid email', async () => {
    await expect(createFirstAdmin({ ...input, password: 'short' })).rejects.toThrow(/Password/);
    await expect(createFirstAdmin({ ...input, email: 'nope' })).rejects.toThrow(/email/i);
    expect(User.__all()).toHaveLength(0);
  });
});
