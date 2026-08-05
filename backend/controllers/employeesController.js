const asyncHandler = require('express-async-handler');
const Employee = require('../models/Employee');
const ApiError = require('../utils/ApiError');
const { sendMail } = require('../utils/mailer');
const { buildEmployeeAccountEmailHtml } = require('../utils/emailTemplates');

// @desc   Get all employees (paginated, searchable, filterable)
// @route  GET /api/employees
// @access Private (admin)
const getEmployees = asyncHandler(async (req, res) => {
  const { search, department, role, status } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const query = {};
  if (search) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }
  if (department) query.department = department;
  if (role) query.role = role;
  if (status === 'active') query.isActive = true;
  if (status === 'inactive') query.isActive = false;

  const [data, total] = await Promise.all([
    Employee.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Employee.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: data.map((e) => e.toSafeObject()),
    pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
  });
});

// @desc   Get single employee
// @route  GET /api/employees/:id
// @access Private (admin)
const getEmployeeById = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    throw new ApiError(404, 'Employee not found');
  }

  res.json(employee.toSafeObject());
});

// @desc   Create a new employee
// @route  POST /api/employees
// @access Private (admin)
const createEmployee = asyncHandler(async (req, res) => {
  const { name, email, phone, department, designation, role, password, isActive } = req.body;

  if (!name || !email || !phone || !department || !password) {
    throw new ApiError(400, 'All fields are required');
  }

  // Unlike Student, no duplicate-email/phone check here — employees may
  // legitimately share either (see Employee.js).

  // Captured before create() — the pre('save') hook hashes `password` in
  // place, and the stored field is select:false, so this is the only place
  // the plaintext is ever available for the welcome email below.
  const plainPassword = password;

  const employee = await Employee.create({
    name,
    email,
    phone,
    department,
    designation,
    role,
    password,
    isActive: isActive === undefined ? true : isActive === 'true' || isActive === true,
    profilePicture: req.file ? `/uploads/employees/${req.file.filename}` : null,
  });

  // Fire-and-forget, isolated: a mail outage must never fail account
  // creation (mirrors studentsController.createStudent's pattern). Without
  // this, the generated password is only ever visible once in the Admin
  // Panel's Add Employee form — if it isn't copied down immediately, the
  // employee has no way to log in.
  try {
    await sendMail({
      to: employee.email,
      subject: 'Your WiZdom Admin Panel Login',
      html: buildEmployeeAccountEmailHtml(employee, plainPassword),
    });
  } catch (mailErr) {
    console.error(`[Mailer] employee=${employee._id} email=${employee.email} - welcome email failed:`, mailErr);
  }

  res.status(201).json(employee.toSafeObject());
});

// @desc   Update an employee (also used for the Deactivate action)
// @route  PATCH /api/employees/:id
// @access Private — super_admin/admin may edit anyone; any employee may
//         edit their own record (see requireRoleOrSelf on the route), but a
//         non-privileged self-edit may only touch their own basic profile,
//         never department/designation/role/isActive (no self-promotion or
//         self-reactivation).
const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    throw new ApiError(404, 'Employee not found');
  }

  const { name, email, phone, department, designation, role, password, isActive } = req.body;
  const isPrivileged = req.user.role === 'super_admin' || req.user.role === 'admin';

  if (email !== undefined) employee.email = email;

  const passwordReset = Boolean(password);
  if (passwordReset) {
    employee.password = password;
  }

  if (name !== undefined) employee.name = name;
  if (phone !== undefined) employee.phone = phone;
  if (req.file) employee.profilePicture = `/uploads/employees/${req.file.filename}`;

  if (isPrivileged) {
    if (department !== undefined) employee.department = department;
    if (designation !== undefined) employee.designation = designation;
    if (role !== undefined) employee.role = role;
    if (isActive !== undefined) employee.isActive = isActive === 'true' || isActive === true;
  }

  // validateModifiedOnly: some existing records predate the current
  // department/role enum values (e.g. legacy "Counsoller"/"counsellor").
  // Mongoose validates the WHOLE document by default, so editing/
  // deactivating one of those employees — without touching the stale
  // field — would otherwise fail on a field nobody is even changing.
  await employee.save({ validateModifiedOnly: true });

  // Same reasoning as createEmployee: a reset password that's only ever
  // shown once in the form is unrecoverable if not copied down immediately.
  if (passwordReset) {
    try {
      await sendMail({
        to: employee.email,
        subject: 'Your WiZdom Admin Panel Password Was Reset',
        html: buildEmployeeAccountEmailHtml(employee, password),
      });
    } catch (mailErr) {
      console.error(`[Mailer] employee=${employee._id} email=${employee.email} - password reset email failed:`, mailErr);
    }
  }

  res.json(employee.toSafeObject());
});

// @desc   Delete an employee
// @route  DELETE /api/employees/:id
// @access Private (admin)
const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    throw new ApiError(404, 'Employee not found');
  }

  await employee.deleteOne();
  res.json({ message: 'Employee deleted successfully' });
});

module.exports = { getEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee };
