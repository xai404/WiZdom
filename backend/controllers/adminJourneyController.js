const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const { buildRemarksByStage } = require('../utils/journeyRemarks');
const { buildJourney, buildStep, isJourneyCompleted } = require('../utils/journeySteps');
const ApiError = require('../utils/ApiError');
const { JOURNEY_STEPS, JOURNEY_STAGES, SUBSTEP_BY_KEY, stepForStageTag } = require('../constants/journeyStages');
const { createNotification } = require('../utils/notify');
const { resolveAccount } = require('../utils/resolveAccount');
const { emitProgressUpdate } = require('../socket');

// @desc    Get a student's journey (same shape studentJourneyController
//          returns to the student themselves — reused so the Admin Panel's
//          Journey tab and the Student App never drift apart).
// @route   GET /api/students/:id/journey
// @access  Private/SuperAdmin
const getStudentJourney = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).select('journey');
  if (!student) throw new ApiError(404, 'Student not found');

  const remarksFor = await buildRemarksByStage(student);
  res.status(200).json({ success: true, journey: buildJourney(student, remarksFor) });
});

// The step a journey entry belongs to — itself for a step, its parent for
// a sub-step key, the matching step for a pre-7-step stage title.
const stepTitleFor = (title) => SUBSTEP_BY_KEY.get(title)?.step || stepForStageTag(title);

// Sends one step (sub-steps, derived status, remarks) to the student's app.
// `title` may be the step itself or one of its sub-steps.
async function pushStepToStudent(student, title) {
  const stepTitle = stepTitleFor(title);
  const definition = JOURNEY_STEPS.find((s) => s.title === stepTitle);
  if (!definition) return;
  const remarksFor = await buildRemarksByStage(student, { forStudent: true });
  const savedByTitle = new Map(student.journey.map((entry) => [entry.title, entry]));
  const step = buildStep(definition, savedByTitle, remarksFor);
  emitProgressUpdate(student._id, step);
}

// @desc    Set one sub-step's status for a student — the only write path
//          onto a sub-step entry in Student.journey. `title` is the
//          sub-step key ("Finance / Funds"); `status` must be one of that
//          sub-step's own options (constants/journeyStages.js).
// @route   PATCH /api/students/:id/journey
// @access  Private/SuperAdmin
const updateStudentJourneyStage = asyncHandler(async (req, res) => {
  const { title, status } = req.body;

  const substep = SUBSTEP_BY_KEY.get(title);
  if (!substep) throw new ApiError(400, 'Invalid sub-step');
  const option = substep.statuses.find((o) => o.value === status);
  if (!option) throw new ApiError(400, `Invalid status for "${substep.label}"`);

  const student = await Student.findById(req.params.id).select('name status journey pushTokens updatedBy');
  if (!student) throw new ApiError(404, 'Student not found');
  if (student.status === 'Closed') {
    throw new ApiError(403, "This student's account is closed — reopen it before updating their journey");
  }

  const updatedAt = new Date();
  const existing = student.journey.find((entry) => entry.title === title);
  if (existing) {
    existing.status = status;
    existing.updatedAt = updatedAt;
  } else {
    student.journey.push({ title, status, updatedAt });
  }

  student.updatedBy = await resolveAccount(req.user);

  // Drives the card's Green ("Resolved") state.
  student.journeyCompleted = isJourneyCompleted(student.journey);

  // validateModifiedOnly: a stale/legacy value on an untouched enum path
  // (e.g. a student whose `status` predates the narrowed Active/Inactive/
  // Closed enum) must never block an otherwise-unrelated journey edit —
  // same reasoning as studentsController.updateStudent.
  await student.save({ validateModifiedOnly: true });

  await createNotification({
    student: student._id,
    type: 'stage_status',
    title: 'Journey Updated',
    body: `${substep.step} — ${substep.label} is now ${option.label}.`,
    stage: substep.step,
  });

  // Real-time push — only after the status is safely persisted above.
  await pushStepToStudent(student, substep.step);

  res.status(200).json({ success: true, journey: student.journey });
});

// @desc    Add a remark to a journey step or one of its sub-steps. `title`
//          is a step title ("Finance") or a sub-step key ("Finance / Funds").
//          Any staff member can add one; each remark is its own entry
//          stamped with who added it, so several people can comment on the
//          same step/sub-step. Shown under it in the student app — NOT
//          posted to the Group Chat.
// @route   POST /api/students/:id/journey/remarks
// @access  Private/Staff
const addStudentJourneyRemark = asyncHandler(async (req, res) => {
  const { title } = req.body;
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';

  if (!title || !(JOURNEY_STAGES.includes(title) || SUBSTEP_BY_KEY.has(title))) {
    throw new ApiError(400, 'Invalid step or sub-step');
  }
  if (!text) throw new ApiError(400, 'Remark text is required');
  if (text.length > 5000) throw new ApiError(400, 'Remark is too long (max 5000 characters)');

  const student = await Student.findById(req.params.id).select('status journey updatedBy');
  if (!student) throw new ApiError(404, 'Student not found');
  if (student.status === 'Closed') {
    throw new ApiError(403, "This student's account is closed — reopen it before updating their journey");
  }

  const author = await resolveAccount(req.user);
  let stage = student.journey.find((st) => st.title === title);
  if (!stage) {
    student.journey.push({ title, status: 'pending', updatedAt: null });
    stage = student.journey[student.journey.length - 1];
  }
  stage.remarks.push({ text, byId: author.id, byName: author.name, byRole: author.displayRole, createdAt: new Date() });
  student.updatedBy = author;
  await student.save({ validateModifiedOnly: true });

  // Live-update the student's progress screen. No push / notification — a
  // remark is a quiet update, not something to alert the student about.
  await pushStepToStudent(student, title);

  const remarksFor = await buildRemarksByStage(student);
  res.status(201).json({ success: true, title, remarks: remarksFor(title) });
});

// @desc    Delete one remark from a journey step or sub-step — its author,
//          or an admin.
// @route   DELETE /api/students/:id/journey/remarks/:remarkId
// @access  Private/Staff
const deleteStudentJourneyRemark = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).select('status journey updatedBy');
  if (!student) throw new ApiError(404, 'Student not found');

  const stage = student.journey.find((st) => st.remarks?.some((r) => String(r._id) === req.params.remarkId));
  if (!stage) throw new ApiError(404, 'Remark not found');
  const remark = stage.remarks.find((r) => String(r._id) === req.params.remarkId);

  const isPrivileged = req.user.role === 'super_admin' || req.user.role === 'admin';
  if (!isPrivileged && String(remark.byId) !== String(req.user.id)) {
    throw new ApiError(403, 'Only the person who added this remark, or an admin, can delete it');
  }

  stage.remarks = stage.remarks.filter((r) => String(r._id) !== req.params.remarkId);
  student.updatedBy = await resolveAccount(req.user);
  await student.save({ validateModifiedOnly: true });
  await pushStepToStudent(student, stage.title);

  const remarksFor = await buildRemarksByStage(student);
  res.status(200).json({ success: true, title: stage.title, remarks: remarksFor(stage.title) });
});

module.exports = { getStudentJourney, updateStudentJourneyStage, addStudentJourneyRemark, deleteStudentJourneyRemark };
