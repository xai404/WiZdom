const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const { mergeSif } = require('../utils/sifPayload');
const { syncInterestFormFromCrm } = require('../utils/crmSif');
const { announceSifSubmissions } = require('../utils/sifSubmissions');

// @desc    Get the signed-in student's own Student Information Form — the
//          study-preference block auto-filled from the CRM Student Interest
//          Form on a phone-number match, plus their LOR/SOP intake notes.
// @route   GET /api/student/sif
// @access  Private/Student
const getMySif = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.user.id).select('sif phone');
  if (!student) throw new ApiError(404, 'Student not found');

  // Pull the CRM interest form across if the block is still empty — a phone
  // match is enough, no conversion/lead-status gate.
  await syncInterestFormFromCrm(student);

  res.set('Cache-Control', 'no-store');
  res.status(200).json({ success: true, sif: student.sif });
});

// @desc    Update the signed-in student's own SIF. Section-level merge — the
//          app's SIF, LOR and SOP tabs each send only their own sections.
// @route   PUT /api/student/sif
// @access  Private/Student
const updateMySif = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.user.id).select('name status sif');
  if (!student) throw new ApiError(404, 'Student not found');
  if (student.status === 'Closed') {
    throw new ApiError(403, 'Your account has been closed. Please contact your counsellor.');
  }

  student.sif = mergeSif(student.sif, req.body.sif ?? req.body, student.name, { allowTermsAcceptance: true });
  await student.save({ validateModifiedOnly: true });

  // First save that completes the SIF / LOR / SOP posts a pinned chat
  // message for staff. Never fails the save itself.
  try {
    await announceSifSubmissions(student);
  } catch (err) {
    console.error(`[sif] submission announcement student=${student._id} failed:`, err);
  }

  res.status(200).json({ success: true, sif: student.sif });
});

module.exports = { getMySif, updateMySif };
