const { makeFakeModel } = require('./fakeCollection');

const Visit = makeFakeModel({ status: 'pending' });
Visit.__uniqueFields = []; // visits have no unique fields

module.exports = Visit;
