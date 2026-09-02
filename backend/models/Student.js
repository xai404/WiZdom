const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Employee = require('./Employee');
const { isStrongPassword, PASSWORD_POLICY_MESSAGE } = require('../utils/passwordPolicy');

// Student Information Form — the raw notes staff collect from a student to
// draft their LOR(s) and SOP, plus the study-preference answers carried
// over from the CRM's public Student Interest Form (see interestFormSchema
// below). All free text, filled on the admin Students panel's "SIF" tab
// (studentsController.updateStudent) and the app's SIF screen. One LOR
// block per recommender (a student usually needs 2-3); a single SOP block.
const lorRecommenderSchema = new mongoose.Schema(
  {
    professorName: { type: String, trim: true, default: '' },
    contactPhone: { type: String, trim: true, default: '' },
    contactEmail: { type: String, trim: true, default: '' },
    degreeStudied: { type: String, trim: true, default: '' },
    cgpa: { type: String, trim: true, default: '' },
    subjectsTopics: { type: String, trim: true, default: '' },
    projects: { type: String, trim: true, default: '' },
    internshipsActivities: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

// Study-preference answers the applicant already gave on the CRM's public
// Student Interest Form (E:\CRM SifSubmission). Seeded onto a student at
// account-provisioning time by the CRM (see E:\CRM\backend\services\
// wizdomService.js) and thereafter editable by the student in the app and
// by staff on the admin SIF tab, exactly like lor/sop. Enum-like values
// (budget / preferredIntake / giftChoice) are kept as free strings so a
// value whose CRM option list has since shifted is never rejected here.
const interestFormSchema = new mongoose.Schema(
  {
    // The applicant's identity fields exactly as submitted on the CRM form —
    // kept as a snapshot alongside the study preferences (distinct from the
    // Student record's own name/email/phone, which drive login).
    applicantName: { type: String, trim: true, default: '' },
    mobile: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    preferredCountries: { type: [String], default: [] },
    preferredStreams: { type: [String], default: [] },
    budget: { type: String, trim: true, default: '' },
    preferredIntake: { type: String, trim: true, default: '' },
    hearAboutUs: { type: String, trim: true, default: '' },
    giftChoice: { type: String, trim: true, default: '' },
    entranceTestSupport: { type: [String], default: [] },
    admissionSupport: { type: [String], default: [] },
    alternateContact: { type: String, trim: true, default: '' },
    agreedToTerms: { type: Boolean, default: false },
    // Set once, by the CRM, when it first seeds this block. Left untouched
    // by later student/admin edits — a marker of provenance, not a
    // last-updated stamp (that's sifSchema.updatedAt).
    sourcedFromCrmAt: { type: Date, default: null },
  },
  { _id: false }
);

// Personal / passport details the student fills in the app (the middle
// block of the paper SIF, between the CRM interest form and the LOR/SOP
// notes). All free text; dates stored as plain 'YYYY-MM-DD' strings so the
// app's date pickers and the admin's <input type="date"> round-trip
// without timezone drift.
const personalDetailsSchema = new mongoose.Schema(
  {
    dateOfBirth: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    // 'yes' | 'no' | '' — has the student ever had a visa rejected.
    previousVisaRejection: { type: String, trim: true, default: '' },
    previousVisaRejectionDetails: { type: String, trim: true, default: '' },
    emergencyContactName: { type: String, trim: true, default: '' },
    emergencyContactRelationship: { type: String, trim: true, default: '' },
    // 'Single' | 'Married' | ''
    maritalStatus: { type: String, trim: true, default: '' },
    spouseDetails: { type: String, trim: true, default: '' },
    passportNumber: { type: String, trim: true, default: '' },
    passportDateOfIssue: { type: String, trim: true, default: '' },
    passportDateOfExpiry: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

// One row of the "Academic Qualification" table on the paper SIF. `level`
// is a fixed row label (10, 11/12, Diploma, …) the UI seeds; the rest are
// the student's entries.
const academicQualificationSchema = new mongoose.Schema(
  {
    level: { type: String, trim: true, default: '' },
    specializationSubjects: { type: String, trim: true, default: '' },
    yearOfPassing: { type: String, trim: true, default: '' },
    percentage: { type: String, trim: true, default: '' },
    backlogs: { type: String, trim: true, default: '' },
    schoolCollegeName: { type: String, trim: true, default: '' },
    boardUniversity: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

// One row of the "Internship / Industry Experience" table.
const internshipRowSchema = new mongoose.Schema(
  {
    nameOfEmployer: { type: String, trim: true, default: '' },
    addressOfEmployer: { type: String, trim: true, default: '' },
    designation: { type: String, trim: true, default: '' },
    salaryMonthly: { type: String, trim: true, default: '' },
    dateFrom: { type: String, trim: true, default: '' },
    dateTo: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

// One row of the "Document Ready With You" checklist. `key` maps to the
// fixed template the UIs seed; `ready` is 'yes' | 'no' | ''.
const documentChecklistItemSchema = new mongoose.Schema(
  {
    key: { type: String, trim: true, default: '' },
    name: { type: String, trim: true, default: '' },
    format: { type: String, trim: true, default: '' },
    ready: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const sifSchema = new mongoose.Schema(
  {
    lor: { type: [lorRecommenderSchema], default: [] },
    // Study preferences carried over from the CRM Student Interest Form,
    // pre-filled on conversion and then editable like everything else here.
    interestForm: { type: interestFormSchema, default: () => ({}) },
    // Personal / passport details + academic history + work experience +
    // document checklist, filled by the student in the app and
    // viewable/editable by staff on the admin SIF tab.
    personalDetails: { type: personalDetailsSchema, default: () => ({}) },
    academicQualifications: { type: [academicQualificationSchema], default: [] },
    internshipExperience: { type: [internshipRowSchema], default: [] },
    documentChecklist: { type: [documentChecklistItemSchema], default: [] },
    sop: {
      courseName: { type: String, trim: true, default: '' },
      motivation: { type: String, trim: true, default: '' },
      additionalInfo: { type: String, trim: true, default: '' },
      expectationsToLearn: { type: String, trim: true, default: '' },
      futurePlans: { type: String, trim: true, default: '' },
    },
    updatedAt: { type: Date, default: null },
    updatedByName: { type: String, default: null },
  },
  { _id: false }
);

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
    // Lockout bookkeeping — see utils/loginThrottle.js.
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    // Pipeline/lifecycle label. Only cross-wired with isActive at the
    // Deactivate/Reactivate action (see studentsController.updateStudent) —
    // isActive is the sole field authController.login checks, so that check
    // never needs to know about this enum.
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Closed'],
      default: 'Active',
    },
    // Free-text "Counselled By" field — a name typed by whoever creates or
    // edits the student, not a ref to an Employee record. (Previously an
    // Employee ObjectId dropdown; changed to plain text per spec.)
    assignedCounsellor: {
      type: String,
      trim: true,
      default: '',
    },

    // Free-text batch/cohort label — purely a display grouping (see
    // StudentCard.tsx, which shows this above the student's own name), not
    // tied to any other collection.
    groupName: {
      type: String,
      trim: true,
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: ['Paid in Full', 'Half Payment', 'Free', null],
      default: null,
    },

    // Denormalized snapshots of who created / last updated this student
    // record. Not refs — the actor could be from either the Admin or
    // Employee collection, and these are display-only audit fields, so a
    // small embedded object avoids needing a Mongoose refPath just for this.
    createdBy: {
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
      name: { type: String, default: null },
      role: { type: String, default: null },
    },
    updatedBy: {
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
      name: { type: String, default: null },
      role: { type: String, default: null },
    },

    lastLoginAt: {
      type: Date,
    },

    // Self-service only (see authController.updateMe) — a student can
    // upload/change their own profile picture; nothing else writes to it.
    profilePicture: {
      type: String,
      default: null,
    },

    // Expo push tokens for devices this student is logged into. A student
    // may have more than one (phone + tablet, reinstall before the old
    // token expires), so this is an array, deduped on registration — see
    // studentPushController.registerPushToken.
    pushTokens: {
      type: [String],
      default: [],
    },

    // Optional — only present for accounts auto-provisioned by the CRM on
    // lead conversion. Kept here (rather than dropped) so that context
    // isn't lost; the WiZdom Admin Portal's Students page can surface it
    // once built. See E:\CRM\backend\services\wizdomService.js.
    //
    // unique+sparse: no two students may share a phone number, but the
    // field stays optional — sparse excludes documents where it's entirely
    // unset from the uniqueness check (see createStudent/updateStudent,
    // which normalize a blank phone to "unset" rather than "").
    phone: { type: String, trim: true, unique: true, sparse: true },
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
            enum: ['pending', 'in_progress', 'completed', 'rejected'],
            default: 'pending',
          },
          updatedAt: { type: Date, default: null },
        },
      ],
      default: [],
    },

    // Accountability layer on top of the Group Chat: which department (if
    // any) is currently on the hook to reply, and whether they've done so.
    // Set by adminChatController.postAdminMessage (explicit @department tag
    // opens it, a reply from that department's own employee closes it) and
    // re-opened by studentChatController.postChatReply when the student
    // follows up before the department has responded. Current-state only —
    // no separate history log; the message thread itself is the history.
    responsibleDepartment: {
      type: String,
      enum: [...Employee.DEPARTMENTS, null],
      default: null,
    },
    awaitingReply: {
      type: Boolean,
      default: false,
    },
    awaitingSince: {
      type: Date,
      default: null,
    },
    lastHandledBy: {
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
      name: { type: String, default: null },
      department: { type: String, default: null },
    },
    lastHandledAt: {
      type: Date,
      default: null,
    },
    // Which message is the one currently waiting on a reply — set alongside
    // awaitingReply/awaitingSince (adminChatController's department-tag
    // path, studentChatController's follow-up path), cleared when a
    // matching-department reply resolves it. Lets the Admin Panel point
    // directly at the specific message instead of just a boolean+timestamp.
    awaitingSinceMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },

    // Recomputed by adminJourneyController.updateStudentJourneyStage
    // whenever a stage changes — true only once every one of the 21 stages
    // is 'completed'. Drives the card's Green ("Resolved") state.
    journeyCompleted: {
      type: Boolean,
      default: false,
    },

    // Timestamp of the most recent Group Chat message in either direction —
    // bumped by studentChatController.postChatReply and
    // adminChatController.postAdminMessage on every send. Drives the
    // Students list order (studentsController.getStudents sorts by this
    // desc) so the most recently active conversation is always on top.
    // Defaults to the record's own creation time so a brand-new student
    // with no messages still sorts near the top rather than the bottom.
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },

    // See sifSchema above — LOR/SOP intake notes, editable on the admin
    // "SIF" tab. Admin-facing only (never included in the student-facing
    // toSafeObject).
    sif: {
      type: sifSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

// TEMPORARY DIAGNOSTIC — investigating a reported student-login-persistence
// bug (password hash changing outside of an explicit admin reset). Logs
// every password-path write with a stack trace so the next occurrence can
// be traced to its actual caller. Safe to delete once root-caused.
studentSchema.pre('save', async function logPasswordWrite(next) {
  if (!this.isModified('password')) return next();
  try {
    const fs = require('fs');
    const path = require('path');
    const line = `[${new Date().toISOString()}] student=${this._id} email=${this.email} isNew=${this.isNew}\n${new Error().stack}\n\n`;
    fs.appendFileSync(path.join(__dirname, '..', 'password-audit.log'), line);
  } catch (logErr) {
    console.error('[password-audit] logging failed:', logErr);
  }
  next();
});

studentSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  if (!isStrongPassword(this.password)) {
    return next(Object.assign(new Error(PASSWORD_POLICY_MESSAGE), { statusCode: 400 }));
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

studentSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// `includeAccountability` defaults to false so this stays safe for the
// student's own `/api/auth/me` (authController.getMe/updateMe/login all call
// this with no args). Department, handler identity, and awaiting-reply
// state are internal staff concepts — students must never see them (per the
// Students module accountability-system plan). Admin-facing endpoints
// (studentsController.js) explicitly pass `true`.
studentSchema.methods.toSafeObject = function toSafeObject(includeAccountability = false) {
  const base = {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    status: this.status,
    assignedCounsellor: this.assignedCounsellor,
    groupName: this.groupName,
    paymentStatus: this.paymentStatus,
    createdBy: this.createdBy,
    createdAt: this.createdAt,
    updatedBy: this.updatedBy,
    updatedAt: this.updatedAt,
    profilePicture: this.profilePicture,
    phone: this.phone,
    gender: this.gender,
    countryInterested: this.countryInterested,
    intakeMonth: this.intakeMonth,
    intakeYear: this.intakeYear,
    course: this.course,
    source: this.source,
  };

  if (!includeAccountability) return base;

  // 'awaiting' always wins (someone needs to act now); otherwise Green only
  // once the whole 21-stage journey is done, else the default in-progress
  // state — see the Students module accountability-system plan.
  const responseStatus = this.awaitingReply ? 'awaiting' : this.journeyCompleted ? 'resolved' : 'in_progress';

  return {
    ...base,
    responsibleDepartment: this.responsibleDepartment,
    awaitingReply: this.awaitingReply,
    awaitingSince: this.awaitingSince,
    awaitingSinceMessageId: this.awaitingSinceMessageId,
    lastHandledBy: this.lastHandledBy,
    lastHandledAt: this.lastHandledAt,
    lastMessageAt: this.lastMessageAt,
    journeyCompleted: this.journeyCompleted,
    responseStatus,
    // Raw per-stage journey — lets the Students list (StudentCard) derive a
    // pipeline-milestone outline (Documentation/Offer/Visa) without a
    // separate request per card. Same data the dedicated
    // GET /:id/journey endpoint exposes, just piggybacked here too.
    journey: this.journey,
    // LOR/SOP intake notes — admin-facing only (this branch), edited on the
    // Students panel's SIF tab.
    sif: this.sif,
  };
};

module.exports = mongoose.model('Student', studentSchema);
