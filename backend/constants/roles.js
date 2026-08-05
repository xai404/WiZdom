// Every Employee-collection role. Kept as one list so "any employee,
// regardless of role, gets the same student-tracking access" (per the
// EMPLOYEE ACCESS spec) is expressed in one place rather than duplicated
// across route files.
const EMPLOYEE_ROLES = ['admin', 'manager', 'staff', 'co_admin'];

// super_admin (Admin collection) + every employee role — used to gate
// routes that any staff member (not just super_admin) should reach.
const STAFF_ROLES = ['super_admin', ...EMPLOYEE_ROLES];

module.exports = { EMPLOYEE_ROLES, STAFF_ROLES };
