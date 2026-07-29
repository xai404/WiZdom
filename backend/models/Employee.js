const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const DEPARTMENT_ROLE_MAP = {
  Editing: 'editing_team',
  Application: 'application_team',
  Counsoller: 'counsellor',
  Other: 'application_team', // <-- placeholder, change this to whatever makes sense for you
};

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
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
      enum: ['Editing', 'Application', 'Counsoller', 'Other'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['super_admin', 'counsellor', 'application_team', 'editing_team'],
      // no default — always derived from department below
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

employeeSchema.pre('save', async function (next) {
  // Derive role from department whenever department changes (including on creation)
  if (this.isNew || this.isModified('department')) {
    this.role = DEPARTMENT_ROLE_MAP[this.department];
  }

  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

employeeSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

employeeSchema.methods.toSafeObject = function () {
  const { _id, name, email, phone, department, role, isActive, lastLoginAt, createdAt, updatedAt } = this;
  return { id: _id, name, email, phone, department, role, isActive, lastLoginAt, createdAt, updatedAt };
};
module.exports = mongoose.model('Employee', employeeSchema);