const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const { sendMail } = require('../utils/mailer');
const { buildStudentAccountEmailHtml, buildStudentPasswordResetEmailHtml } = require('../utils/emailTemplates');
const { resolveAccount } = require('../utils/resolveAccount');

// @desc    Get all students (paginated, searchable, filterable)
// @route   GET /api/students
// @access  Private/Staff (super_admin + every employee role)
const getStudents = asyncHandler(async (req, res) => {
  const { search, status, intakeYear, intakeMonth, assignedCounsellor } = req.query;
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

  const [data, total] = await Promise.all([
    Student.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Student.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: data.map((s) => s.toSafeObject(true)),
    pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
  });
});

// @desc    Get a single student
// @route   GET /api/students/:id
// @access  Private/Staff (super_admin + every employee role)
const getStudentById = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found');
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
    status,
  } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email and password are required');
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
    status,
    createdBy,
  });

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
    status,
  } = req.body;

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

  if (status !== undefined && status !== student.status) {
    // 'Inactive' is the one status value that toggles account access
    // (isActive, below) — moving into or out of it is "deactivate/
    // reactivate" and is admin-only; every other pipeline transition
    // (Lead/Follow Up/Converted/Closed) stays open to any employee.
    const togglesAccountAccess = status === 'Inactive' || student.status === 'Inactive';
    if (togglesAccountAccess && !isPrivileged) {
      throw new ApiError(403, 'Only admins can deactivate or reactivate a student account');
    }

    student.status = status;
    // Only place status and isActive cross-wire — keeps authController.login's
    // isActive-only deactivation check working unchanged.
    if (status === 'Inactive') student.isActive = false;
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

  student.updatedBy = await resolveAccount(req.user);

  // validateModifiedOnly: a stale/legacy value on some untouched enum path
  // (status, responsibleDepartment, a journey stage) must never block an
  // otherwise-unrelated edit — see the identical Employee issue this
  // session (authController.login / updateEmployee).
  await student.save({ validateModifiedOnly: true });

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
