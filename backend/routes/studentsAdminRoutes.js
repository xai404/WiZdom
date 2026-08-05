const express = require('express');
const router = express.Router();
const { protect, requireRole, blockStudents } = require('../middleware/authMiddleware');
const {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
} = require('../controllers/studentsController');
const { getStudentJourney, updateStudentJourneyStage } = require('../controllers/adminJourneyController');
const {
  getStudentChat,
  postAdminMessage,
  deleteAdminMessage,
  togglePinMessage,
} = require('../controllers/adminChatController');

// Any non-student (staff) account may reach this router — view/search, add
// a student, open a profile, track/update journey, chat, and edit a
// student's record are open to every employee role, whatever their
// specific role value (blockStudents rather than allowlisting role
// strings, so a legacy/uncommon role value can't get silently locked out
// — see authMiddleware.js). Deactivating a student's account (see
// updateStudent's status handling) and deleting one are admin-only.
router.use(protect, blockStudents);
const PRIVILEGED_ROLES = ['super_admin', 'admin'];

router
  .route('/')
  .get(getStudents)
  .post(createStudent);

router
  .route('/:id')
  .get(getStudentById)
  .patch(updateStudent)
  .delete(requireRole(...PRIVILEGED_ROLES), deleteStudent);

router
  .route('/:id/journey')
  .get(getStudentJourney)
  .patch(updateStudentJourneyStage);

router
  .route('/:id/chat')
  .get(getStudentChat)
  .post(postAdminMessage);

router.route('/:id/chat/:messageId').delete(deleteAdminMessage);
router.route('/:id/chat/:messageId/pin').patch(togglePinMessage);

module.exports = router;
