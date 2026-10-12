// In-memory stand-in for a Mongoose model, used by tests so they need no database.
// It only implements the calls our code makes (equality plus $in/$gt/$gte/$lt/$lte/$ne filters).
// It does NOT test real Mongoose or MongoDB behaviour.
const mongoose = require('mongoose');

const valuesEqual = (a, b) => {
  if (a == null || b == null) return a == b; // eslint-disable-line eqeqeq
  if (a instanceof Date || b instanceof Date) return new Date(a).getTime() === new Date(b).getTime();
  if (typeof a === 'object' || typeof b === 'object') return String(a) === String(b);
  return a === b;
};

const num = (v) => (v instanceof Date ? v.getTime() : v);

const matchesCondition = (value, cond) => {
  const isOperatorObject =
    cond && typeof cond === 'object' && !(cond instanceof Date) && Object.keys(cond).some((k) => k.startsWith('$'));
  if (!isOperatorObject) return valuesEqual(value, cond);
  return Object.entries(cond).every(([op, arg]) => {
    switch (op) {
      case '$in':
        return arg.some((a) => valuesEqual(value, a));
      case '$ne':
        return !valuesEqual(value, arg);
      case '$gt':
        return value != null && num(value) > num(arg);
      case '$gte':
        return value != null && num(value) >= num(arg);
      case '$lt':
        return value != null && num(value) < num(arg);
      case '$lte':
        return value != null && num(value) <= num(arg);
      default:
        throw new Error(`fake model: unsupported operator ${op}`);
    }
  });
};

const matches = (doc, filter = {}) => Object.entries(filter).every(([k, v]) => matchesCondition(doc[k], v));
const clone = (doc) => (doc ? { ...doc } : null);

const makeFakeModel = (defaults = {}) => {
  let store = [];

  class FakeQuery {
    constructor(run) {
      this.run = run;
      this.sortSpec = null;
      this.limitN = null;
    }
    select() {
      return this;
    }
    sort(spec) {
      this.sortSpec = spec;
      return this;
    }
    limit(n) {
      this.limitN = n;
      return this;
    }
    then(resolve, reject) {
      return Promise.resolve()
        .then(() => {
          let result = this.run();
          if (Array.isArray(result)) {
            if (this.sortSpec) {
              const entries = Object.entries(this.sortSpec);
              result = [...result].sort((a, b) => {
                for (const [key, dir] of entries) {
                  const x = num(a[key]);
                  const y = num(b[key]);
                  if (x < y) return -dir;
                  if (x > y) return dir;
                }
                return 0;
              });
            }
            if (this.limitN) result = result.slice(0, this.limitN);
          }
          return result;
        })
        .then(resolve, reject);
    }
  }

  // Supports plain assignment plus $set, like the updates our code sends.
  const applyUpdate = (doc, update) => {
    Object.assign(doc, update.$set ?? update, { updatedAt: new Date() });
  };

  const Model = {
    async create(data) {
      const unique = Model.__uniqueFields ?? ['email'];
      for (const field of unique) {
        if (data[field] !== undefined && store.some((d) => d[field] === data[field])) {
          const err = new Error('E11000 duplicate key');
          err.code = 11000;
          throw err;
        }
      }
      const now = new Date();
      const doc = { _id: new mongoose.Types.ObjectId(), ...defaults, ...data, createdAt: now, updatedAt: now };
      store.push(doc);
      return clone(doc);
    },
    findOne: (filter) => new FakeQuery(() => clone(store.find((d) => matches(d, filter)))),
    findById: (id) => new FakeQuery(() => clone(store.find((d) => String(d._id) === String(id)))),
    exists: (filter) =>
      new FakeQuery(() => {
        const found = store.find((d) => matches(d, filter));
        return found ? { _id: found._id } : null;
      }),
    find: (filter) => new FakeQuery(() => store.filter((d) => matches(d, filter)).map(clone)),
    countDocuments: (filter) => new FakeQuery(() => store.filter((d) => matches(d, filter)).length),
    findByIdAndUpdate: (id, update) =>
      new FakeQuery(() => {
        const doc = store.find((d) => String(d._id) === String(id));
        if (!doc) return null;
        applyUpdate(doc, update);
        return clone(doc);
      }),
    // Conditional single-document update (the fake is single-threaded, so it is trivially atomic).
    findOneAndUpdate: (filter, update) =>
      new FakeQuery(() => {
        const doc = store.find((d) => matches(d, filter));
        if (!doc) return null;
        applyUpdate(doc, update);
        return clone(doc);
      }),
    updateMany: (filter, update) =>
      new FakeQuery(() => {
        const docs = store.filter((d) => matches(d, filter));
        docs.forEach((d) => applyUpdate(d, update));
        return { modifiedCount: docs.length };
      }),

    // Test helpers (not part of the Mongoose API)
    __reset: () => {
      store = [];
    },
    __all: () => store.map(clone),
    __set: (id, patch) => {
      const doc = store.find((d) => String(d._id) === String(id));
      Object.assign(doc, patch);
    },
  };

  return Model;
};

module.exports = { makeFakeModel };
