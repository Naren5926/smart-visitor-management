const { makeFakeModel } = require('./fakeCollection');

const SecurityEvent = makeFakeModel({ cleared: false });
SecurityEvent.__uniqueFields = ['visit']; // one black mark per visit

module.exports = SecurityEvent;
