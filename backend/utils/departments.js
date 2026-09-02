const Employee = require('../models/Employee');

// The set of departments that currently have at least one active employee.
// A department with nobody in it is a dead end for the accountability state
// machine: tagging it sets Student.awaitingReply/responsibleDepartment, and
// postAdminMessage/postChatReply only clear that when an employee FROM that
// department replies — which can never happen. Mirrors the filter behind
// GET /api/employees/departments/active (employeesController), kept here so
// the send paths can reject an unstaffed tag rather than trusting the client
// to have hidden it.
//
// { $ne: false } (not { isActive: true }): distinct() is a raw query and
// never applies the schema's `default: true`, so a legacy record with the
// field missing must still count as staffed.
const getStaffedDepartments = async () => {
  const staffed = new Set(await Employee.distinct('department', { isActive: { $ne: false } }));
  return Employee.DEPARTMENTS.filter((d) => staffed.has(d));
};

const isDepartmentStaffed = async (department) => {
  const count = await Employee.countDocuments({ department, isActive: { $ne: false } });
  return count > 0;
};

module.exports = { getStaffedDepartments, isDepartmentStaffed };
