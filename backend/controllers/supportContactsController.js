const asyncHandler = require('express-async-handler');
const Employee = require('../models/Employee');
const Admin = require('../models/Admin');

// Finds the department's Head (role: 'manager') first; falls back to any
// other active employee in that department if no Head is currently set, so
// the call picker still resolves to *someone* rather than showing nothing.
const findDepartmentContact = async (department, label, key) => {
  const head = await Employee.findOne({ department, role: 'manager', isActive: true }).select('name phone');
  const employee = head ?? (await Employee.findOne({ department, isActive: true }).select('name phone'));
  if (!employee?.phone) return null;
  return { key, label, name: employee.name, phone: employee.phone };
};

// @desc    Super admin's phone number for the Login screen's "Call
//          Helpline" button — public/no auth, since there's no token yet
//          at that point.
// @route   GET /api/student/helpline
// @access  Public
const getHelplineContact = asyncHandler(async (req, res) => {
  const superAdmin = await Admin.findOne().select('name phone');
  if (!superAdmin?.phone) {
    return res.status(404).json({ success: false, message: 'Helpline number is not configured' });
  }
  res.status(200).json({ success: true, contact: { name: superAdmin.name, phone: superAdmin.phone } });
});

// @desc    The post-login call picker's 3 contacts — WiZdom (super admin),
//          Editing Team, and Application Team.
// @route   GET /api/student/support-contacts
// @access  Private/Student
const getSupportContacts = asyncHandler(async (req, res) => {
  const [editing, application, superAdmin] = await Promise.all([
    findDepartmentContact('Editing', 'Editing Team', 'editing'),
    findDepartmentContact('Application', 'Application Team', 'application'),
    Admin.findOne().select('name phone'),
  ]);

  const contacts = [];
  if (superAdmin?.phone) {
    contacts.push({ key: 'admin', label: 'WiZdom', name: superAdmin.name, phone: superAdmin.phone });
  }
  if (editing) contacts.push(editing);
  if (application) contacts.push(application);

  res.status(200).json({ success: true, contacts });
});

module.exports = { getHelplineContact, getSupportContacts };
