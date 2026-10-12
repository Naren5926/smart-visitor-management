const { makeFakeModel } = require('./fakeCollection');

const TeacherBlock = makeFakeModel({ active: true });
TeacherBlock.__uniqueFields = [];

module.exports = TeacherBlock;
