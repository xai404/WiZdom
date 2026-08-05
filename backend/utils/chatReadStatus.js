const Employee = require('../models/Employee');
const Admin = require('../models/Admin');

// The full "group" for a student's chat thread: the student themselves
// plus every currently active staff account (super_admin(s) + every
// active employee, whatever their specific role). Computed fresh per
// request — deliberately not cached/stored on the message — since staff
// join/leave/get deactivated over time and a message's read-by-everyone
// status must reflect who's active *now*, not who was active when it was
// sent.
const getActiveParticipantIds = async (studentId) => {
  const [employees, admins] = await Promise.all([
    Employee.find({ isActive: true }).select('_id'),
    Admin.find().select('_id'),
  ]);
  return [
    studentId.toString(),
    ...employees.map((e) => e._id.toString()),
    ...admins.map((a) => a._id.toString()),
  ];
};

// Maps each message to include `fullyRead`: true once every OTHER
// participant (everyone in the group except whoever sent it) has read it —
// the WhatsApp-group "blue tick" condition. A message sent by the student
// requires every active staff account; a message sent by staff requires
// the student plus every OTHER active staff account. `readBy` itself is
// stripped from the output — it's bookkeeping, not something either
// frontend needs to reason about directly.
const attachReadStatus = (messages, participantIds, studentId) => {
  const studentIdStr = studentId.toString();
  return messages.map((m) => {
    const obj = typeof m.toObject === 'function' ? m.toObject() : { ...m };
    const senderIdStr = obj.sender === 'student' ? studentIdStr : obj.senderId ? obj.senderId.toString() : null;
    const required = participantIds.filter((id) => id !== senderIdStr);
    const readSet = new Set((obj.readBy || []).map((id) => id.toString()));
    obj.fullyRead = required.length === 0 || required.every((id) => readSet.has(id));
    delete obj.readBy;
    return obj;
  });
};

module.exports = { getActiveParticipantIds, attachReadStatus };
