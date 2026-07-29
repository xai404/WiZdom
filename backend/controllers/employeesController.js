const asyncHandler = require('express-async-handler');
const Employee = require('../models/Employee');
const ApiError = require('../utils/ApiError');

// @desc   Get all employees
// @route  GET /api/employees
// @access Private (admin)
const getEmployees = asyncHandler(async (req, res) => {
  const employees = await Employee.find().sort({ createdAt: -1 });
  res.json(employees);
});

// @desc   Get single employee
// @route  GET /api/employees/:id
// @access Private (admin)
const getEmployeeById = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    throw new ApiError(404, 'Employee not found');
  }

  res.json(employee);
});

// @desc   Create a new employee
// @route  POST /api/employees
// @access Private (admin)
const createEmployee = asyncHandler(async (req, res) => {
  const { name, email, phone, department, password } = req.body;

  if (!name || !email || !phone || !department || !password) {
    throw new ApiError(400, 'All fields are required');
  }

  const existing = await Employee.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'An employee with this email already exists');
  }

  const employee = await Employee.create({
    name,
    email,
    phone,
    department,
    password,
  });

  // Strip password out of the response manually since create() ignores select:false
  const { password: _pw, ...employeeData } = employee.toObject();
  res.status(201).json(employeeData);
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

module.exports = { getEmployees, getEmployeeById, createEmployee, deleteEmployee };