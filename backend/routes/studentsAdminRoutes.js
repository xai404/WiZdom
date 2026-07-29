const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/authMiddleware');
const { getStudents, getStudentById, deleteStudent } = require('../controllers/studentsController');

router.use(protect, requireRole('super_admin'));

router.get('/', getStudents);
router.get('/:id', getStudentById);
router.delete('/:id', deleteStudent);

module.exports = router;