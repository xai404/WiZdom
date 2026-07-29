const Admin = require('../models/Admin');
const Employee = require('../models/Employee');
const generateToken = require('../utils/generateToken');
const ApiError = require('../utils/ApiError');

const MODELS_BY_ROLE = {
  admin: Admin,
  employee: Employee,
};

const login = async (email, password) => {
  for (const role of ['admin', 'employee']) {
    const Model = MODELS_BY_ROLE[role];
    const user = await Model.findOne({ email }).select('+password');
    if (!user) continue;
    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new ApiError(401, 'Invalid email or password');
    if (role === 'employee' && !user.isActive) {
      throw new ApiError(403, 'Your account has been deactivated. Contact your administrator.');
    }
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });
    const token = generateToken({ id: user._id.toString(), role });
    return { token, user: user.toSafeObject() };
  }
  throw new ApiError(401, 'Invalid email or password');
};

const getCurrentUser = async (id, role) => {
  const Model = MODELS_BY_ROLE[role];
  if (!Model) throw new ApiError(401, 'Invalid session');
  const user = await Model.findById(id);
  if (!user) throw new ApiError(404, 'User not found');
  return user.toSafeObject();
};

module.exports = { login, getCurrentUser, MODELS_BY_ROLE };
