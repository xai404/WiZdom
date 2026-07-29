const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const studentRoutes = require('./routes/studentRoutes');           // existing: /journey (student-facing)
const studentsAdminRoutes = require('./routes/studentsAdminRoutes'); // new: admin CRUD
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const employeesRoutes = require('./routes/employeesRoutes');
const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
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

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/student', studentRoutes);          // /api/student/journey — student app
app.use('/api/students', studentsAdminRoutes);   // /api/students, /api/students/:id — admin panel

app.use(notFound);
app.use(errorHandler);

module.exports = app;