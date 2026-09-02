const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const { sendMail } = require('../utils/mailer');
const { buildStudentAccountEmailHtml, buildStudentPasswordResetEmailHtml } = require('../utils/emailTemplates');
const { resolveAccount } = require('../utils/resolveAccount');
const { sanitizeSif } = require('../utils/sifPayload');
const { syncInterestFormFromCrm } = require('../utils/crmSif');
const { emitStudentProfileUpdated } = require('../socket');

const PAYMENT_STATUSES = ['Paid in Full', 'Half Payment', 'Free'];

// @desc    Get all students (paginated, searchable, filterable)
// @route   GET /api/students
// @access  Private/Staff (super_admin + every employee role)
// The single "Filter" dropdown on the admin Students list (both admin and
// employee accounts). Milestone values map to a journey stage that must be
// completed (or, for a visa rejection, marked 'rejected'); the two account
// states map straight to Student.status.
const MILESTONE_STAGE = {
  documentation_completed: { title: 'Documentation', status: 'completed' },
  offer_received: { title: 'Offer Letters', status: 'completed' },
  visa_approved: { title: 'Visa Status Update', status: 'completed' },
  visa_rejected: { title: 'Visa Status Update', status: 'rejected' },
};

const getStudents = asyncHandler(async (req, res) => {
  const { search, status, intakeYear, intakeMonth, assignedCounsellor, milestone } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const query = {};
  if (search) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }
  if (status) query.status = status;
  if (intakeYear) query.intakeYear = Number(intakeYear);
  if (intakeMonth) query.intakeMonth = Number(intakeMonth);
  if (assignedCounsellor) query.assignedCounsellor = new RegExp(assignedCounsellor.trim(), 'i');

  if (milestone === 'inactive') query.status = 'Inactive';
  else if (milestone === 'closed') query.status = 'Closed';
  else if (Object.prototype.hasOwnProperty.call(MILESTONE_STAGE, milestone)) {
    query.journey = { $elemMatch: MILESTONE_STAGE[milestone] };
  }

  const [data, total] = await Promise.all([
    // Most recently active conversation first. lastMessageAt defaults to the
    // record's creation time (see Student.js) so a student with no messages
    // yet still sorts sensibly; createdAt is the tiebreaker for any legacy
    // record written before that field existed (run scripts/backfillLastMessageAt.js).
    Student.find(query)
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Student.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    // The list cards only need journey / accountability / group / payment —
    // never the SIF block (passport no., DOB, address, emergency contacts).
    // Ship it only from getStudentById when a detail panel is actually open,
    // not for 20-100 rows on every list fetch and silent socket reload.
    data: data.map((s) => {
      const obj = s.toSafeObject(true);
      delete obj.sif;
      return obj;
    }),
    pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
  });
});

// @desc    Get a single student
// @route   GET /api/students/:id
// @access  Private/Staff (super_admin + every employee role)
const getStudentById = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found');
  // Auto-fill the SIF interest-form block from the CRM on a phone match if
  // it hasn't been filled yet (no conversion/lead-status gate).
  await syncInterestFormFromCrm(student);
  res.status(200).json(student.toSafeObject(true));
});

// @desc    Create a student
// @route   POST /api/students
// @access  Private/SuperAdmin
const createStudent = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    course,
    intakeMonth,
    intakeYear,
    countryInterested,
    assignedCounsellor,
    groupName,
    paymentStatus,
    status,
  } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email and password are required');
  }
  if (paymentStatus && !PAYMENT_STATUSES.includes(paymentStatus)) {
    throw new ApiError(400, 'Invalid payment status');
  }

  const existing = await Student.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'A student with this email already exists');
  }

  // Blank stays "unset" (not "") so the phone field's unique+sparse index
  // only ever compares students who actually have a number.
  const normalizedPhone = phone && phone.trim() ? phone.trim() : undefined;
  if (normalizedPhone) {
    const existingPhone = await Student.findOne({ phone: normalizedPhone });
    if (existingPhone) {
      throw new ApiError(409, 'A student with this phone number already exists');
    }
  }

  // Captured before create() — the pre('save') hook hashes `password` in
  // place, and the stored field is select:false, so this is the only place
  // the plaintext is ever available for the welcome email below.
  const plainPassword = password;
  const createdBy = await resolveAccount(req.user);

  const student = await Student.create({
    name,
    email,
    phone: normalizedPhone,
    password,
    course,
    intakeMonth,
    intakeYear,
    countryInterested,
    assignedCounsellor: (assignedCounsellor || '').trim(),
    groupName: (groupName || '').trim(),
    paymentStatus: paymentStatus || null,
    status,
    createdBy,
  });

  // Pull the CRM Student Interest Form across if this new student's phone
  // matches one — no conversion/lead-status gate.
  await syncInterestFormFromCrm(student);

  // Fire-and-forget, isolated: a mail outage must never fail account
  // creation (mirrors CRM's wizdomService.js provisioning pattern).
  try {
    await sendMail({
      to: student.email,
      subject: 'Your WiZdom Student Portal Login',
      html: buildStudentAccountEmailHtml(student, plainPassword),
    });
  } catch (mailErr) {
    console.error(`[Mailer] student=${student._id} email=${student.email} - welcome email failed:`, mailErr);
  }

  // Never echo the plaintext password back in the API response — it's
  // delivered to the student by email only (above). If mail delivery ever
  // needs a visible fallback, that should be a deliberate one-time-reveal
  // flow, not a field on the general create/update response body.
  res.status(201).json(student.toSafeObject(true));
});

// @desc    Update a student (also used for the Deactivate/Reactivate action)
// @route   PATCH /api/students/:id
// @access  Private/SuperAdmin
const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found');

  const {
    name,
    email,
    phone,
    password,
    course,
    intakeMonth,
    intakeYear,
    countryInterested,
    assignedCounsellor,
    groupName,
    paymentStatus,
    status,
    sif,
  } = req.body;

  if (paymentStatus !== undefined && paymentStatus && !PAYMENT_STATUSES.includes(paymentStatus)) {
    throw new ApiError(400, 'Invalid payment status');
  }

  // Login credentials (email/password) are only ever admin-editable here —
  // any employee, regardless of department, would otherwise be able to
  // silently take over a student's login by changing both at once.
  const isPrivileged = req.user.role === 'super_admin' || req.user.role === 'admin';

  if (email && email.toLowerCase() !== student.email) {
    if (!isPrivileged) {
      throw new ApiError(403, "Only admins can change a student's login email");
    }
    const existing = await Student.findOne({ email: email.toLowerCase(), _id: { $ne: student._id } });
    if (existing) {
      throw new ApiError(409, 'A student with this email already exists');
    }
    student.email = email;
  }

  if (phone !== undefined) {
    const normalizedPhone = phone && phone.trim() ? phone.trim() : undefined;
    if (normalizedPhone && normalizedPhone !== student.phone) {
      const existingPhone = await Student.findOne({ phone: normalizedPhone, _id: { $ne: student._id } });
      if (existingPhone) {
        throw new ApiError(409, 'A student with this phone number already exists');
      }
    }
    student.phone = normalizedPhone;
  }

  if (name !== undefined) student.name = name;
  if (course !== undefined) student.course = course;
  if (intakeMonth !== undefined) student.intakeMonth = intakeMonth;
  if (intakeYear !== undefined) student.intakeYear = intakeYear;
  if (countryInterested !== undefined) student.countryInterested = countryInterested;
  if (assignedCounsellor !== undefined) student.assignedCounsellor = (assignedCounsellor || '').trim();
  if (groupName !== undefined) student.groupName = (groupName || '').trim();
  if (paymentStatus !== undefined) student.paymentStatus = paymentStatus || null;

  if (status !== undefined && status !== student.status) {
    // 'Closed' is the status value that toggles account access (isActive,
    // below) — moving into or out of it is "deactivate/reactivate" and is
    // admin-only (studentsAdminRoutes.js documents this); every other
    // pipeline transition is open to any staff role.
    const togglesAccountAccess = status === 'Closed' || student.status === 'Closed';
    if (togglesAccountAccess && !isPrivileged) {
      throw new ApiError(403, 'Only admins can deactivate or reactivate a student account');
    }
    student.status = status;
    // Only place status and isActive cross-wire — keeps authController.login's
    // isActive-only deactivation check working unchanged.
    if (status === 'Closed') student.isActive = false;
    if (status === 'Active') student.isActive = true;
  }

  // Optional — blank/omitted leaves the existing password untouched. When
  // set, the pre('save') hook below hashes it in place; the plaintext is
  // only ever available here, for the one-time reset email.
  const plainPassword = typeof password === 'string' ? password.trim() : '';
  if (plainPassword) {
    if (!isPrivileged) {
      throw new ApiError(403, "Only admins can reset a student's password");
    }
    student.password = plainPassword;
  }

  const actor = await resolveAccount(req.user);

  // Student Information Form (LOR/SOP intake notes) — free text, all
  // optional. Same normalization as the student self-service path.
  if (sif !== undefined && sif !== null) {
    student.sif = sanitizeSif(sif, actor.name);
  }

  student.updatedBy = actor;

  // validateModifiedOnly: a stale/legacy value on some untouched enum path
  // (status, responsibleDepartment, a journey stage) must never block an
  // otherwise-unrelated edit — see the identical Employee issue this
  // session (authController.login / updateEmployee).
  await student.save({ validateModifiedOnly: true });
  emitStudentProfileUpdated(student);

  if (plainPassword) {
    try {
      await sendMail({
        to: student.email,
        subject: 'Your WiZdom Password Was Reset',
        html: buildStudentPasswordResetEmailHtml(student, plainPassword),
      });
    } catch (mailErr) {
      console.error(`[Mailer] student=${student._id} email=${student.email} - password reset email failed:`, mailErr);
    }
  }

  // Same reasoning as createStudent: never echo the plaintext password back
  // in the response, even on a reset — email is the only delivery channel.
  res.status(200).json(student.toSafeObject(true));
});

// @desc    Delete a student
// @route   DELETE /api/students/:id
// @access  Private/SuperAdmin
const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found');

  // Both collections require a student ref, so leaving these behind orphans them.
  await Promise.all([
    Message.deleteMany({ student: student._id }),
    Notification.deleteMany({ student: student._id }),
  ]);
  await student.deleteOne();

  res.status(200).json({ success: true, message: 'Student deleted' });
});

module.exports = { getStudents, getStudentById, createStudent, updateStudent, deleteStudent };
