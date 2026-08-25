const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { isStrongPassword, PASSWORD_POLICY_MESSAGE } = require('../utils/passwordPolicy');

const DEPARTMENTS = ['Editing', 'Application', 'Counselling', 'Admin', 'Visa', 'Finance'];

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    // Not unique — unlike Student, more than one employee record may
    // legitimately share an email/phone (e.g. a shared department line, or
    // one person holding more than one role).
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      enum: DEPARTMENTS,
    },
    designation: {
      type: String,
      trim: true,
      default: '',
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    // Permission level — independent of department. Deliberately not
    // 'super_admin': that literal is reserved for the Admin collection and
    // is load-bearing in authController.getMe's role-to-model routing.
    // 'co_admin' is presentational only (a badge/dashboard-copy distinction)
    // — no route currently branches on it; every Employee role is gated
    // identically today (see studentsAdminRoutes/employeesRoutes, both
    // requireRole('super_admin') only).
    role: {
      type: String,
      enum: ['admin', 'manager', 'staff', 'co_admin'],
      default: 'staff',
    },
    profilePicture: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
    // Lockout bookkeeping — see utils/loginThrottle.js.
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

employeeSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  if (!isStrongPassword(this.password)) {
    return next(Object.assign(new Error(PASSWORD_POLICY_MESSAGE), { statusCode: 400 }));
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

employeeSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

employeeSchema.methods.toSafeObject = function () {
  const {
    _id,
    name,
    email,
    phone,
    department,
    designation,
    role,
    profilePicture,
    isActive,
    lastLoginAt,
    createdAt,
    updatedAt,
  } = this;
  return {
    id: _id,
    name,
    email,
    phone,
    department,
    designation,
    role,
    profilePicture,
    isActive,
    lastLoginAt,
    createdAt,
    updatedAt,
  };
};

employeeSchema.statics.DEPARTMENTS = DEPARTMENTS;

module.exports = mongoose.model('Employee', employeeSchema);
