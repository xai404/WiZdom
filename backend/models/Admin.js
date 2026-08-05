const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { isStrongPassword, PASSWORD_POLICY_MESSAGE } = require('../utils/passwordPolicy');

const adminSchema = new mongoose.Schema(
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
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
role: {
  type: String,
  default: 'super_admin',
  immutable: true,
},
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    profilePicture: {
      type: String,
      default: null,
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

adminSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  if (!isStrongPassword(this.password)) {
    return next(Object.assign(new Error(PASSWORD_POLICY_MESSAGE), { statusCode: 400 }));
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

adminSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

adminSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    profilePicture: this.profilePicture,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('Admin', adminSchema);
