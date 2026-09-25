const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const Message = require('../models/Message');
const Employee = require('../models/Employee');
const ApiError = require('../utils/ApiError');
const { JOURNEY_STAGES } = require('../constants/journeyStages');
const { createNotification } = require('../utils/notify');
const { sendPushToStudent } = require('../utils/pushService');
const { resolveAccount } = require('../utils/resolveAccount');
const { getActiveParticipantIds, attachReadStatus } = require('../utils/chatReadStatus');
const { isDepartmentStaffed } = require('../utils/departments');
const { emitChatMessage, emitChatMessageUpdated, emitChatThreadCleared } = require('../socket');

// After a viewer's readBy is added to a batch of messages, re-broadcast just
// the ones that actually changed so every open chat view (the student's app
// and other staff) can turn the tick blue in real time via the existing
// chat:message-updated event — no polling, no new event type.
const broadcastReadStatus = async (messageIds, studentId) => {
  if (!messageIds.length) return;
  const participantIds = await getActiveParticipantIds(studentId);
  const fresh = await Message.find({ _id: { $in: messageIds } });
  attachReadStatus(fresh, participantIds, studentId).forEach((m) => emitChatMessageUpdated(m, studentId));
};

// Broadcasts an in-place change to an existing message (edit / soft-delete /
// pin) to the student's room and every staff view, with read-status
// attached so the tick colour doesn't flicker until the next poll.
const broadcastMessageUpdate = async (message, studentId) => {
  const participantIds = await getActiveParticipantIds(studentId);
  const [withStatus] = attachReadStatus([message], participantIds, studentId);
  emitChatMessageUpdated(withStatus, studentId);
};

// @desc    Get a student's Group Chat thread (admin-side view of the same
//          single shared conversation the Student App reads/writes).
//          Viewing it is treated as reading it — the viewing staff member
//          is added to every message's readBy (this, plus every OTHER
//          active staff account and the student having also read a given
//          message, is what turns its tick blue — a WhatsApp-group-style
//          "read by everyone", not just "read by someone"). readByAdmin is
//          also still bulk-set on student messages, kept for whatever else
//          still reads that simpler boolean.
// @route   GET /api/students/:id/chat
// @access  Private/Staff (super_admin + every employee role)
const getStudentChat = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).select(
    '_id awaitingReply responsibleDepartment awaitingSinceMessageId'
  );
  if (!student) throw new ApiError(404, 'Student not found');

  // Which messages this viewer hadn't read yet — captured before the update
  // so we can push a real-time tick refresh for exactly those afterwards.
  const newlyReadByViewer = (
    await Message.find({ student: student._id, readBy: { $ne: req.user.id } }).select('_id')
  ).map((m) => m._id);

  // Mark read BEFORE fetching — so this viewer's own readBy entry is
  // already reflected in the fullyRead status computed below, rather than
  // showing stale (missing their own just-now read) until their next poll.
  await Promise.all([
    Message.updateMany({ student: student._id }, { $addToSet: { readBy: req.user.id } }),
    Message.updateMany(
      { student: student._id, sender: 'student', readByAdmin: false },
      { $set: { readByAdmin: true } }
    ),
  ]);

  const messages = await Message.find({ student: student._id }).sort({ createdAt: 1 });

  const participantIds = await getActiveParticipantIds(student._id);
  const withStatus = attachReadStatus(messages, participantIds, student._id);

  // Real-time tick refresh for anyone else watching this thread — fire and
  // forget so a socket hiccup never fails the read.
  broadcastReadStatus(newlyReadByViewer, student._id).catch((err) =>
    console.error(`[adminChatController] read-status broadcast student=${student._id} failed:`, err)
  );

  // "Awaiting reply" for an UNTAGGED thread (nobody on the hook) clears as
  // soon as the first staff member opens it — this GET is that signal. A
  // thread a department owns is untouched here: it stays awaiting until
  // that department actually replies (postAdminMessage). The guard keeps
  // this from writing on every poll — once cleared, awaitingReply is false.
  if (student.awaitingReply && !student.responsibleDepartment) {
    await Student.updateOne(
      { _id: student._id },
      { $set: { awaitingReply: false, awaitingSince: null, awaitingSinceMessageId: null } }
    );
  }

  res.status(200).json({ success: true, messages: withStatus });
});

// @desc    Send a message into a student's Group Chat, optionally tagged to
//          a journey stage and/or a department. A stage-tagged message *is*
//          that stage's remark (see studentJourneyController.getMyJourney)
//          — an untagged message is just a normal chat message, per spec.
//          Any staff account (super_admin or any employee role) can send.
//
//          Department accountability state machine (see the Students module
//          accountability-system plan):
//          - An explicit department tag opens (or re-routes) the pending
//            request: responsibleDepartment/awaitingReply/awaitingSince are
//            set, no manual assignment needed.
//          - Otherwise, if the sender is an employee (not super_admin)
//            whose own department matches the student's current
//            responsibleDepartment, and it's still awaiting a reply, this
//            message IS that reply — it auto-resolves (awaitingReply
//            false, lastHandledBy/lastHandledAt stamped). The first
//            employee from the tagged department to reply becomes the
//            handler; nobody assigns this manually.
//          - Any other message (unrelated department, no tag) leaves the
//            accountability state untouched — it's just chat.
// @route   POST /api/students/:id/chat
// @access  Private/Staff (super_admin + every employee role)
const postAdminMessage = asyncHandler(async (req, res) => {
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
  // on the client to have hidden it from the picker.
  if (department && !(await isDepartmentStaffed(department))) {
    throw new ApiError(400, `The ${department} team has no active members to handle this`);
  }

  const student = await Student.findById(req.params.id).select('name status responsibleDepartment awaitingReply pushTokens');
  if (!student) throw new ApiError(404, 'Student not found');
  if (student.status === 'Closed') {
    throw new ApiError(403, "This student's account is closed — reopen it before messaging them");
  }

  if (replyTo) {
    const target = await Message.findOne({ _id: replyTo, student: student._id }).select('_id');
    if (!target) throw new ApiError(400, 'Invalid reply target');
  }

  const sender = await resolveAccount(req.user);
  // Employees' resolveAccount().displayRole IS their department; super_admin
  // has no department of its own, so their replies never auto-resolve a tag.
  const senderDepartment = req.user.role === 'super_admin' ? null : sender.displayRole;

  const message = await Message.create({
    student: student._id,
    sender: 'admin',
    senderName: sender.name,
    senderRole: sender.displayRole,
    senderId: sender.id,
    text: text.trim(),
    stage: stage || null,
    department: department || null,
    replyTo: replyTo || null,
    // Trivially "read" by whoever sent it — see readBy on Message.js.
    readBy: [sender.id],
  });

  // lastMessageAt bumps on every send so the Students list re-sorts this
  // thread to the top. The branches below decide whether the thread is
  // awaiting a reply at all, and only they touch awaitingSinceMessageId.
  const studentUpdate = { lastMessageAt: new Date() };
  let departmentTagged = false;

  // A stage-tagged message is a remark, i.e. it counts as updating the
  // student's journey — stamp the record-level audit field. An untagged
  // message is just chat, so it doesn't touch this.
  if (stage) {
    studentUpdate.updatedBy = sender;
  }

  if (department) {
    // Explicit (re)tag — that department is now on the hook.
    studentUpdate.responsibleDepartment = department;
    studentUpdate.awaitingReply = true;
    studentUpdate.awaitingSince = new Date();
    studentUpdate.awaitingSinceMessageId = message._id;
    departmentTagged = true;
  } else if (senderDepartment && student.responsibleDepartment === senderDepartment && student.awaitingReply) {
    // The responsible department has replied — the wait is over.
    studentUpdate.awaitingReply = false;
    studentUpdate.awaitingSince = null;
    studentUpdate.awaitingSinceMessageId = null;
    studentUpdate.lastHandledBy = { id: sender.id, name: sender.name, department: senderDepartment };
    studentUpdate.lastHandledAt = new Date();
  } else if (student.awaitingReply && !student.responsibleDepartment) {
    // Untagged thread nobody formally owes a reply on — any staff reply
    // ends the wait (same rule as "first staff member to open it" in
    // getStudentChat).
    studentUpdate.awaitingReply = false;
    studentUpdate.awaitingSince = null;
    studentUpdate.awaitingSinceMessageId = null;
  } else if (student.awaitingReply) {
    // The thread was ALREADY awaiting a reply and a department still owes
    // it — this message isn't from that department, so leave the wait in
    // place; awaitingSinceMessageId keeps pointing at whichever message
    // opened it.
    studentUpdate.awaitingReply = true;
  }
  // else: an untagged, staff-initiated message into a thread nobody owes a
  // reply on — it's just chat, per the state machine above, so the
  // accountability state is left completely untouched (staff must never put
  // their own thread into "awaiting response").

  await Student.updateOne({ _id: student._id }, { $set: studentUpdate });

  // Chat messages get a phone push (so the student is alerted even when
  // the app isn't open) but deliberately do NOT create a Notification
  // document the way stage/journey updates do — the in-app Notifications
  // screen must only ever show journey/application updates, never chat
  // content (chat already has its own real-time delivery + unread badge).
  try {
    await sendPushToStudent(student, {
      title: stage ? `New remark on ${stage}` : 'New message',
      body: text.trim(),
      data: { type: 'chat_message', stage: stage || null },
    });
  } catch (err) {
    console.error(`[adminChatController] push to student=${student._id} failed:`, err);
  }

  if (departmentTagged) {
    await createNotification({
      student: student._id,
      type: 'department_tag',
      title: `${department} Team tagged`,
      body: text.trim(),
      department,
    });
  }

  const participantIds = await getActiveParticipantIds(student._id);
  const [withStatus] = attachReadStatus([message], participantIds, student._id);

  // Real-time push — only after the message is safely persisted above.
  emitChatMessage(withStatus, student._id);

  res.status(201).json({ success: true, message: withStatus });
});

// @desc    Soft-delete a message in a student's Group Chat. The row (and its
//          text) is kept in the DB for the audit trail — only the frontend
//          hides it, rendering a "This message was deleted" tombstone in
//          place of the text whenever `deleted` is true.
// @route   DELETE /api/students/:id/chat/:messageId
// @access  Private/Staff (super_admin + every employee role)
const deleteAdminMessage = asyncHandler(async (req, res) => {
  const message = await Message.findOne({ _id: req.params.messageId, student: req.params.id });
  if (!message) throw new ApiError(404, 'Message not found');

  if (!message.deleted) {
    message.deleted = true;
    await message.save();
    await broadcastMessageUpdate(message, req.params.id);
  }

  res.status(200).json({ success: true, message });
});

// @desc    Permanently clear a student's ENTIRE Group Chat thread — every
//          message, including stage-tagged ones. Unlike single-message
//          delete (a soft, audit-trailed tombstone any staff member can
//          apply to any message), this is a real hard delete with no undo,
//          which is why it's restricted to admin/super_admin. It also wipes
//          journey remarks for any stage whose only remark was a chat
//          message — see the Message schema's `stage` field and
//          studentJourneyController.getMyJourney, which derives each
//          stage's remark from this same collection rather than storing it
//          separately.
// @route   DELETE /api/students/:id/chat
// @access  Private/Admin (super_admin + admin only)
const clearStudentChat = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).select('_id');
  if (!student) throw new ApiError(404, 'Student not found');

  await Message.deleteMany({ student: student._id });

  // No messages left, so nothing can be "awaiting" a reply or a read —
  // reset the accountability flags rather than leaving a stale badge on a
  // now-empty thread.
  await Student.updateOne(
    { _id: student._id },
    { $set: { awaitingReply: false, awaitingSince: null, awaitingSinceMessageId: null } }
  );

  emitChatThreadCleared(student._id);

  res.status(200).json({ success: true });
});

// A message can only be edited within this window of when it was sent —
// same WhatsApp-style "edit, but only briefly" semantics as most chat apps,
// so a stale message can't be silently rewritten long after the fact.
const EDIT_WINDOW_MS = 10 * 60 * 1000;

// @desc    Edit the text of one of the CURRENT staff member's own messages,
//          within 10 minutes of sending it. Unlike delete (any staff member
//          may delete any admin message) this is restricted to the
//          message's own sender — editing someone else's words isn't the
//          same kind of action as retracting your own.
// @route   PATCH /api/students/:id/chat/:messageId
// @access  Private/Staff (message's own sender only)
const editAdminMessage = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    throw new ApiError(400, 'Message text is required');
  }

  const message = await Message.findOne({ _id: req.params.messageId, student: req.params.id });
  if (!message) throw new ApiError(404, 'Message not found');

  if (message.sender !== 'admin' || String(message.senderId) !== String(req.user.id)) {
    throw new ApiError(403, 'You can only edit your own messages');
  }
  if (message.deleted) {
    throw new ApiError(400, 'Cannot edit a deleted message');
  }
  if (Date.now() - message.createdAt.getTime() > EDIT_WINDOW_MS) {
    throw new ApiError(400, 'The 10-minute edit window for this message has expired');
  }

  message.text = text.trim();
  message.edited = true;
  await message.save();
  await broadcastMessageUpdate(message, req.params.id);

  res.status(200).json({ success: true, message });
});

// @desc    Toggle whether a message is pinned — surfaced as a banner at the
//          top of the Admin Panel's chat view. Any staff member can
//          pin/unpin any message; it's a non-destructive bookmark, so
//          there's no "who pinned it" tracking, unlike delete.
// @route   PATCH /api/students/:id/chat/:messageId/pin
// @access  Private/Staff (super_admin + every employee role)
const togglePinMessage = asyncHandler(async (req, res) => {
  const message = await Message.findOne({ _id: req.params.messageId, student: req.params.id });
  if (!message) throw new ApiError(404, 'Message not found');

  message.pinned = !message.pinned;
  await message.save();
  await broadcastMessageUpdate(message, req.params.id);

  res.status(200).json({ success: true, message });
});

module.exports = {
  getStudentChat,
  postAdminMessage,
  deleteAdminMessage,
  editAdminMessage,
  clearStudentChat,
  togglePinMessage,
};
