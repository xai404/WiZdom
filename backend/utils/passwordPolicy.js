// Enforced in each model's pre('save') hook, before hashing.
const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.';

const isStrongPassword = (password) =>
  typeof password === 'string' &&
  password.length >= 8 &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

module.exports = { isStrongPassword, PASSWORD_POLICY_MESSAGE };
