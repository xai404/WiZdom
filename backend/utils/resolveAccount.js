const Admin = require('../models/Admin');
const Employee = require('../models/Employee');

// Resolves { id, name, role, displayRole } for whichever account is making
// a request — mirrors authController.getMe's role-to-model routing.
//
// `name` is the real person's name — used for internal audit fields
// (Student.createdBy/updatedBy) and the Admin Panel's own chat view, where
// staff accountability matters.
//
// `displayRole` is a student-facing label (e.g. "Counselling", "Editing",
// "Admin") — used when stamping a chat message's senderRole, so the
// Student App can show "who" sent a message without exposing an
// individual staff member's personal name.
async function resolveAccount(reqUser) {
  if (reqUser.role === 'super_admin') {
    const account = await Admin.findById(reqUser.id).select('name');
    return { id: reqUser.id, name: account?.name || 'Unknown', role: reqUser.role, displayRole: 'Admin' };
  }

  const account = await Employee.findById(reqUser.id).select('name department');
  return {
    id: reqUser.id,
    name: account?.name || 'Unknown',
    role: reqUser.role,
    displayRole: account?.department || 'Team',
  };
}

module.exports = { resolveAccount };
