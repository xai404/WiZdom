const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const studentRoutes = require('./routes/studentRoutes');           // existing: /journey (student-facing)
const studentsAdminRoutes = require('./routes/studentsAdminRoutes'); // new: admin CRUD
const notificationsRoutes = require('./routes/notificationsRoutes'); // staff-facing department-tag feed
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const employeesRoutes = require('./routes/employeesRoutes');
const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// crossOriginResourcePolicy relaxed to 'cross-origin' so the admin web app
// (served from a different origin/port) can load images from /uploads —
// helmet's default 'same-origin' would 403 those <img> requests.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header (server-to-server, curl, the mobile app) is always
      // allowed; a browser request must appear in CORS_ORIGINS.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'WiZdom API is running' });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/student', studentRoutes);          // /api/student/journey — student app
app.use('/api/students', studentsAdminRoutes);   // /api/students, /api/students/:id — admin panel
app.use('/api/notifications', notificationsRoutes); // staff department-tag notification bell

app.use(notFound);
app.use(errorHandler);

module.exports = app;