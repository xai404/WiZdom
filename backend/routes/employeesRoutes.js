const express = require('express');
const router = express.Router();
const { protect, requireRole, requireRoleOrSelf, blockStudents } = require('../middleware/authMiddleware');
const { employeeUpload, verifyUploadedImage } = require('../middleware/uploadMiddleware');
const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employeesController');

// Any non-student account (super_admin or any Employee, whatever their
// specific role value — including legacy ones) may reach this router at
// all. The finer-grained checks below then decide who may create/edit/
// delete someone ELSE's record.
router.use(protect, blockStudents);
// super_admin and the 'admin' role may perform every action on any
// employee (create/edit/deactivate/delete); every other role may only view
// the directory and edit their own record — see requireRoleOrSelf below.
const PRIVILEGED_ROLES = ['super_admin', 'admin'];

router
  .route('/')
  .get(getEmployees) // any staff role can view the full directory
  .post(requireRole(...PRIVILEGED_ROLES), employeeUpload.single('profilePicture'), verifyUploadedImage, createEmployee);

router
  .route('/:id')
  .get(getEmployeeById) // any staff role can view another employee's details
  // Editing someone ELSE's record requires a privileged role; any employee
  // may still edit their own record (see updateEmployee, which further
  // limits which fields a non-privileged self-edit can change).
  .patch(requireRoleOrSelf(...PRIVILEGED_ROLES), employeeUpload.single('profilePicture'), verifyUploadedImage, updateEmployee)
  .delete(requireRole(...PRIVILEGED_ROLES), deleteEmployee);

module.exports = router;
