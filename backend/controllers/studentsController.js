const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');

// @desc    Get all students
// @route   GET /api/students
// @access  Private/SuperAdmin
const getStudents = asyncHandler(async (req, res) => {
  const students = await Student.find().sort({ createdAt: -1 });
  res.status(200).json(students.map((s) => s.toSafeObject()));
});

// @desc    Get a single student
// @route   GET /api/students/:id
// @access  Private/SuperAdmin
const getStudentById = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found');
  res.status(200).json(student.toSafeObject());
});

// @desc    Create a student
// @route   POST /api/students
// @access  Private/SuperAdmin
const createStudent = asyncHandler(async (req, res) => {
  const { name, email, phone, password, course, intakeMonth, intakeYear } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email and password are required');
  }

  const existing = await Student.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'A student with this email already exists');
  }

  const student = await Student.create({
    name,
    email,
    phone,
    password,
    course,
    intakeMonth,
    intakeYear,
  });

  res.status(201).json(student.toSafeObject());
});

// @desc    Delete a student
// @route   DELETE /api/students/:id
// @access  Private/SuperAdmin
const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found');
  await student.deleteOne();
  res.status(200).json({ success: true, message: 'Student deleted' });
});

module.exports = { getStudents, getStudentById, createStudent, deleteStudent };