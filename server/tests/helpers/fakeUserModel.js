// In-memory stand-in for the Mongoose User model, used by tests so they need no database.
// It only implements the calls our code makes. It does NOT test real Mongoose or MongoDB.
const mongoose = require('mongoose');

let store = [];

class FakeQuery {
  constructor(run) {
    this.run = run;
  }
  select() {
    return this;
  }
  sort() {
    return this;
  }
  limit() {
    return this;
  }
  then(resolve, reject) {
    return Promise.resolve().then(this.run).then(resolve, reject);
  }
}

const matches = (doc, filter = {}) => Object.entries(filter).every(([k, v]) => doc[k] === v);
const clone = (doc) => (doc ? { ...doc } : null);

const User = {
  async create(data) {
    if (store.some((u) => u.email === data.email)) {
      const err = new Error('E11000 duplicate key');
      err.code = 11000;
      throw err;
    }
    const now = new Date();
    const doc = {
      _id: new mongoose.Types.ObjectId(),
      role: 'visitor',
      status: 'active',
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    store.push(doc);
    return clone(doc);
  },
  findOne: (filter) => new FakeQuery(() => clone(store.find((u) => matches(u, filter)))),
  findById: (id) => new FakeQuery(() => clone(store.find((u) => String(u._id) === String(id)))),
  exists: (filter) =>
    new FakeQuery(() => {
      const found = store.find((u) => matches(u, filter));
      return found ? { _id: found._id } : null;
    }),
  countDocuments: (filter) => new FakeQuery(() => store.filter((u) => matches(u, filter)).length),
  find: (filter) => new FakeQuery(() => store.filter((u) => matches(u, filter)).map(clone)),
  findByIdAndUpdate: (id, update) =>
    new FakeQuery(() => {
      const doc = store.find((u) => String(u._id) === String(id));
      if (!doc) return null;
      Object.assign(doc, update, { updatedAt: new Date() });
      return clone(doc);
    }),

  // Test helpers (not part of the Mongoose API)
  __reset: () => {
    store = [];
  },
  __all: () => store.map(clone),
};

module.exports = User;
