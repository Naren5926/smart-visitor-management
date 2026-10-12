const mongoose = require('mongoose');

// Connects to MongoDB (Atlas in production). The URI comes from the environment only.
const connectDB = async (uri) => {
  if (!uri) throw new Error('MONGODB_URI is not set');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  return mongoose.connection;
};

module.exports = connectDB;
