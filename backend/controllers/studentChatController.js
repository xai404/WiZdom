const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const Message = require('../models/Message');
const Employee = require('../models/Employee');
const ApiError = require('../utils/ApiError');
const { JOURNEY_STAGES } = require('../constants/journeyStages');
const { createNotification } = require('../utils/notify');
const { getActiveParticipantIds, attachReadStatus } = require('../utils/chatReadStatus');
const { isDepartmentStaffed } = require('../utils/departments');
const { emitChatMessage, emitChatMessageUpdated } = require('../socket');

// Defense in depth for every student-initiated write path — a closed
// student is normally force-logged-out the moment status flips (see
// socket.js's emitStudentProfileUpdated + auth-context.tsx), but a session
// that missed that push (app was offline) must still be refused here
// rather than relying on the client.
const assertAccountOpen = async (studentId) => {
  const student = await Student.findById(studentId).select('status');
  if (!student) throw new ApiError(404, 'Student not found');
  if (student.status === 'Closed') {
    throw new ApiError(403, 'Your account has been closed. Please contact your counsellor.');
  }
};

// Broadcasts an in-place change to one of the student's own messages (edit
// or soft-delete) so every staff chat view reflects it immediately rather
// than on its next 6.5s poll.
const broadcastMessageUpdate = async (message, studentId) => {
  const participantIds = await getActiveParticipantIds(studentId);
  const [withStatus] = attachReadStatus([message], participantIds, studentId);
  emitChatMessageUpdated(withStatus, studentId);
};

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
  // An unstaffed department can never reply, so tagging it would strand the
  // thread in "awaiting reply" forever — refuse it here rather than relying
  // on the app to have hidden it from the picker.
  if (department && !(await isDepartmentStaffed(department))) {
    throw new ApiError(400, 'That team is not available right now. Please send without a tag.');
  }

  const student = await Student.findById(req.user.id).select('name status responsibleDepartment awaitingReply');
  if (!student) {
    throw new ApiError(404, 'Student not found');
  }
  // Defense in depth — a closed student is normally force-logged-out the
  // moment status flips (see socket.js's emitStudentProfileUpdated +
  // auth-context.tsx), but a session that missed that push (app was
  // offline) must still be refused here rather than relying on the client.
  if (student.status === 'Closed') {
    throw new ApiError(403, 'Your account has been closed. Please contact your counsellor.');
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

  // Every student message puts the thread into "awaiting" on the Admin
  // Panel — someone on staff has to act. What CLEARS it differs:
  //   - a department is on the hook -> only a reply from that department
  //     (adminChatController.postAdminMessage)
  //   - nobody is on the hook -> the first staff member to open the thread,
  //     or any staff reply (adminChatController.getStudentChat /
  //     postAdminMessage)
  // Also bumps lastMessageAt so the Students list re-sorts this thread up.
  const update = {
    lastMessageAt: new Date(),
    awaitingSinceMessageId: message._id,
  };

  // Don't restart an already-running wait timer just because the student
  // sent a follow-up while still waiting — unless they explicitly (re-)tag
  // a department, which is a fresh ask of that team.
  if (!student.awaitingReply || department) {
    update.awaitingReply = true;
    update.awaitingSince = new Date();
  }
  if (department) {
    update.responsibleDepartment = department;
  }

  await Student.updateOne({ _id: student._id }, { $set: update });

  // Every student message raises a staff notification (the admin bell), not
  // just the first one that reopens a resolved thread and not just tagged
  // threads. When a department is on the hook it's tagged to them; an
  // untagged/brand-new student's message becomes a 'General' notification
  // every staff account sees, so it can never land in a void nobody is
  // alerted to. createNotification also fires the real-time socket nudge.
  await createNotification({
    student: student._id,
    type: targetDepartment ? 'department_tag' : 'message',
    title: targetDepartment ? `${targetDepartment} Team - new message` : `New message from ${student.name}`,
    body: text.trim(),
    department: targetDepartment || 'General',
  });

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

// @desc    Soft-delete one of the student's own Group Chat messages —
//          mirrors adminChatController.deleteAdminMessage (same tombstone
//          behavior), but scoped to sender:'student' so a student can only
//          ever remove something they themselves sent, never a staff reply.
// @route   DELETE /api/student/chat/:messageId
// @access  Private/Student
const deleteMyMessage = asyncHandler(async (req, res) => {
  await assertAccountOpen(req.user.id);

  const message = await Message.findOne({
    _id: req.params.messageId,
    student: req.user.id,
    sender: 'student',
  });
  if (!message) throw new ApiError(404, 'Message not found');

  if (!message.deleted) {
    message.deleted = true;
    await message.save();
    await broadcastMessageUpdate(message, req.user.id);
  }

  res.status(200).json({ success: true, message });
});

// Same 10-minute "edit, but only briefly" window the Admin Panel enforces
// on staff messages (see adminChatController.editAdminMessage).
const EDIT_WINDOW_MS = 10 * 60 * 1000;

// @desc    Edit the text of one of the student's own Group Chat messages,
//          within 10 minutes of sending it — mirrors
//          adminChatController.editAdminMessage, scoped to sender:'student'
//          so a student can only ever change their own words.
// @route   PATCH /api/student/chat/:messageId
// @access  Private/Student
const editMyMessage = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    throw new ApiError(400, 'Message text is required');
  }

  await assertAccountOpen(req.user.id);

  const message = await Message.findOne({
    _id: req.params.messageId,
    student: req.user.id,
    sender: 'student',
  });
  if (!message) throw new ApiError(404, 'Message not found');
  if (message.deleted) {
    throw new ApiError(400, 'Cannot edit a deleted message');
  }
  if (Date.now() - message.createdAt.getTime() > EDIT_WINDOW_MS) {
    throw new ApiError(400, 'The 10-minute edit window for this message has expired');
  }

  message.text = text.trim();
  message.edited = true;
  await message.save();
  await broadcastMessageUpdate(message, req.user.id);

  res.status(200).json({ success: true, message });
});

module.exports = { getMyChat, postChatReply, markChatRead, deleteMyMessage, editMyMessage };
