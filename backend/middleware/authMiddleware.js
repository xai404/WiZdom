const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/ApiError');

// Verifies the JWT and attaches { id, role } to req.user
const protect = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized, no token provided');
  }

  try {
    // Pinned to block algorithm-confusion attacks.
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (error) {
    throw new ApiError(401, 'Not authorized, token invalid or expired');
  }
});

// Restricts a route to one or more roles, e.g. requireRole('admin')
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw new ApiError(403, 'You do not have permission to perform this action');
  }
  next();
};

// Lets a request through if the caller's role is one of `roles`, OR the
// caller is acting on their own account (route's :id param === their own
// id) — e.g. any employee may edit themselves, but editing someone ELSE
// still requires one of the privileged roles.
const requireRoleOrSelf = (...roles) => (req, res, next) => {
  const isSelf = req.user && req.params.id === req.user.id;
  const hasRole = req.user && roles.includes(req.user.role);
  if (!isSelf && !hasRole) {
    throw new ApiError(403, 'You do not have permission to perform this action');
  }
  next();
};

// Blocks students only, rather than allowlisting specific staff role
// strings — an Employee/Admin account should always have baseline access
// to staff-only resources (like the employee directory) regardless of
// their specific role value, including legacy role/department values that
// predate the current enum and wouldn't match a strict allowlist.
const blockStudents = (req, res, next) => {
  if (!req.user || req.user.role === 'student') {
    throw new ApiError(403, 'You do not have permission to perform this action');
  }
  next();
};

module.exports = { protect, requireRole, requireRoleOrSelf, blockStudents };
