const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema(
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
      default: 'student',
      immutable: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },

    // Optional — only present for accounts auto-provisioned by the CRM on
    // lead conversion. Kept here (rather than dropped) so that context
    // isn't lost; the WiZdom Admin Portal's Students page can surface it
    // once built. See E:\CRM\backend\services\wizdomService.js.
    phone: { type: String, trim: true },
    gender: { type: String },
    countryInterested: { type: [String], default: undefined },
    intakeMonth: { type: Number },
    intakeYear: { type: Number },
    course: { type: String, trim: true },
    crmStudentId: { type: String, index: true },
    source: { type: String, default: 'wizdom' },

    // Read-only from the Student App's perspective — the "My Journey"
    // screen only ever GETs this. Only Admin-side tooling (not built yet)
    // is meant to write to it. Missing/unset stages default to "pending"
    // at read-time (see studentJourneyController.js), so this can stay
    // empty until an admin actually starts updating a student's progress.
    journey: {
      type: [
        {
          _id: false,
          title: { type: String, required: true },
          status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed'],
            default: 'pending',
          },
          updatedAt: { type: Date, default: null },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

studentSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

studentSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

studentSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    createdAt: this.createdAt,
    phone: this.phone,
    gender: this.gender,
    countryInterested: this.countryInterested,
    intakeMonth: this.intakeMonth,
    intakeYear: this.intakeYear,
    course: this.course,
    source: this.source,
  };
};

module.exports = mongoose.model('Student', studentSchema);
