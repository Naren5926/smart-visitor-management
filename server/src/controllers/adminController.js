const mongoose = require('mongoose');
const TeacherBlock = require('../models/TeacherBlock');
const HttpError = require('../utils/httpError');
const { toPublicBlock } = require('../utils/publicVisit');

// Every block a teacher has made, with the reason they gave.
const blockLogs = async (req, res) => {
  const blocks = await TeacherBlock.find().sort({ createdAt: -1 }).limit(200);
  res.json({ blocks: blocks.map(toPublicBlock) });
};

const liftBlock = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid block id');
  const block = await TeacherBlock.findOneAndUpdate(
    { _id: id, active: true },
    { active: false, liftedAt: new Date(), liftedBy: req.user._id },
    { new: true }
  );
  if (!block) throw new HttpError(404, 'No active block found');
  res.json({ block: toPublicBlock(block) });
};

module.exports = { blockLogs, liftBlock };
