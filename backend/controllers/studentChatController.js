const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const Message = require('../models/Message');
const Employee = require('../models/Employee');
const ApiError = require('../utils/ApiError');
const { JOURNEY_STAGES } = require('../constants/journeyStages');
const { createNotification } = require('../utils/notify');
const { getActiveParticipantIds, attachReadStatus } = require('../utils/chatReadStatus');
const { emitChatMessage } = require('../socket');

// @desc    Get the current student's single Group Chat thread
// @route   GET /api/student/chat
// @access  Private/Student
const getMyChat = asyncHandler(async (req, res) => {
  // `department` is internal staff-only metadata when an ADMIN sets it —
  // students never see which team a staff member privately routed a
  // message to. A student's OWN messages are the exception: if the
  // student themselves tagged a department when sending, that's their own
  // choice, not an internal routing detail, so it's kept for their view
  // and only stripped from admin-authored messages below. `senderId` IS
  // now selected (unlike before) so attachReadStatus can tell which staff
  // member sent an admin message; it's stripped back out below before the
  // response goes out, same as ever. `pinned` is exposed (as an
  // "important messages" bookmark students can view, read-only), and
  // `deleted`/`replyTo` are exposed so the app can render tombstones and
  // quoted replies the same way the Admin Panel does.
  const messages = await Message.find({ student: req.user.id }).sort({ createdAt: 1 });

  const participantIds = await getActiveParticipantIds(req.user.id);
  const withStatus = attachReadStatus(messages, participantIds, req.user.id).map((m) => {
    delete m.senderId;
    if (m.sender === 'admin') delete m.department;
    return m;
  });

  // Without this, a cache sitting anywhere between the app and this
  // endpoint (mobile OS network cache, intermediate proxy/CDN) can serve a
  // stale response to a repeated identical GET — new messages then only
  // ever appear after something forces a genuinely fresh request (e.g. a
  // fresh login), not on a normal poll/refresh.
  res.set('Cache-Control', 'no-store');
  res.status(200).json({ success: true, messages: withStatus });
});

// @desc    Student reply inside the Group Chat, optionally tagged to a stage
//          and/or a department.
//          - An explicit department tag (student picking "@Application" etc.
//            in the composer) opens/re-routes the pending request exactly
//            like an admin's tag does: responsibleDepartment/awaitingReply/
//            awaitingSince are set, no staff assignment needed.
//          - Otherwise, if a department is already responsible for this
//            thread and it had already replied (awaitingReply false), this
//            follow-up re-opens it — the department hasn't answered THIS
//            message yet. If it's already awaiting a reply, nothing resets
//            (don't restart an in-progress wait timer just because the
//            student sent another message while still waiting).
// @route   POST /api/student/chat/reply
// @access  Private/Student
const postChatReply = asyncHandler(async (req, res) => {
  const { text, stage, replyTo, department } = req.body;

  if (!text || !text.trim()) {
    throw new ApiError(400, 'Message text is required');
  }
  if (stage && !JOURNEY_STAGES.includes(stage)) {
    throw new ApiError(400, 'Invalid stage');
  }
  if (department && !Employee.DEPARTMENTS.includes(department)) {
    throw new ApiError(400, 'Invalid department');
  }

  const student = await Student.findById(req.user.id).select('name responsibleDepartment awaitingReply');
  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  if (replyTo) {
    const target = await Message.findOne({ _id: replyTo, student: req.user.id }).select('_id');
    if (!target) throw new ApiError(400, 'Invalid reply target');
  }

  const message = await Message.create({
    student: req.user.id,
    sender: 'student',
    senderName: student.name,
    text: text.trim(),
    stage: stage || null,
    department: department || null,
    replyTo: replyTo || null,
    // Trivially "read" by whoever sent it — see readBy on Message.js.
    readBy: [req.user.id],
  });

  const targetDepartment = department || student.responsibleDepartment;

  // Notify the responsible department on *every* student message while
  // they're the ones on the hook — not just the first message that reopens
  // an already-resolved thread. Previously a student's second/third
  // follow-up (sent while awaitingReply was already true) triggered no
  // notification at all, which is what made the staff notification bell
  // feel broken for an ongoing conversation.
  if (targetDepartment) {
    const update = { awaitingSinceMessageId: message._id };
    if (department) {
      update.responsibleDepartment = department;
      update.awaitingReply = true;
      update.awaitingSince = new Date();
    } else if (!student.awaitingReply) {
      update.awaitingReply = true;
      update.awaitingSince = new Date();
    }
    await Student.updateOne({ _id: student._id }, { $set: update });

    await createNotification({
      student: student._id,
      type: 'department_tag',
      title: `${targetDepartment} Team - new message`,
      body: text.trim(),
      department: targetDepartment,
    });
  }

  const [withStatus] = attachReadStatus([message], await getActiveParticipantIds(req.user.id), req.user.id);

  // Real-time push — only after the message is safely persisted above.
  emitChatMessage(withStatus, req.user.id);

  res.status(201).json({ success: true, message: withStatus });
});

// @desc    Mark every admin message in the current student's chat as read
// @route   POST /api/student/chat/read
// @access  Private/Student
const markChatRead = asyncHandler(async (req, res) => {
  await Message.updateMany(
    { student: req.user.id, sender: 'admin' },
    { $set: { readByStudent: true }, $addToSet: { readBy: req.user.id } }
  );
  res.status(200).json({ success: true });
});

module.exports = { getMyChat, postChatReply, markChatRead };
