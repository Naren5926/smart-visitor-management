const mongoose = require('mongoose');
const HttpError = require('../utils/httpError');

// Returns a clear 503 instead of letting requests hang while MongoDB is not connected.
const requireDb = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return next(new HttpError(503, 'Database is not connected'));
  }
  next();
};

module.exports = requireDb;
