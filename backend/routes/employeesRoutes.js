const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/authMiddleware');
const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  deleteEmployee,
} = require('../controllers/employeesController');

router.use(protect, requireRole('super_admin'));

router.route('/').get(getEmployees).post(createEmployee);
router.route('/:id').get(getEmployeeById).delete(deleteEmployee);

module.exports = router;