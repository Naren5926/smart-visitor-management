const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const requireDb = require('./middleware/requireDb');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const visitRoutes = require('./routes/visitRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const securityRoutes = require('./routes/securityRoutes');
const adminRoutes = require('./routes/adminRoutes');

// The app is created here but NOT started, so tests can use it without opening a port.
const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '200kb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'smart-visitor-management-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// These routes need the database, so they answer 503 when it is not connected.
app.use('/api/auth', requireDb, authRoutes);
app.use('/api/users', requireDb, userRoutes);
app.use('/api/visits', requireDb, visitRoutes);
app.use('/api/teacher', requireDb, teacherRoutes);
app.use('/api/security', requireDb, securityRoutes);
app.use('/api/admin', requireDb, adminRoutes);

// Unknown routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Central error handler. Only errors marked safe (expose) or client errors show their message;
// anything else (database errors, bugs) is logged and answered with a generic message.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON body' });
  }
  const status = err.status || 500;
  if (status >= 500 && !err.expose) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
  res.status(status).json({ message: err.expose ? err.message : 'Request failed' });
});

module.exports = app;
