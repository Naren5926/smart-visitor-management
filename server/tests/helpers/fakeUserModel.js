// In-memory stand-in for the Mongoose User model (see fakeCollection.js for what it supports).
const { makeFakeModel } = require('./fakeCollection');

module.exports = makeFakeModel({ role: 'visitor', status: 'active' });
