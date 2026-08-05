const crypto = require('crypto');

// Mirrors the algorithm in admin/src/utils/generatePassword.ts and
// E:\CRM\backend\services\wizdomService.js exactly, so every
// auto-generated password across the whole system looks/behaves the same.
// Ambiguous-looking characters (0/O, 1/l/I) are left out so a password
// read off-screen isn't easily mistyped.
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SPECIAL = '!@#$%^&*()-_=+';
const ALL_CHARS = UPPER + LOWER + DIGITS + SPECIAL;

const randomChar = (chars) => chars[crypto.randomInt(chars.length)];

const generateStrongPassword = (length = 14) => {
  const required = [randomChar(UPPER), randomChar(LOWER), randomChar(DIGITS), randomChar(SPECIAL)];
  const rest = Array.from({ length: length - required.length }, () => randomChar(ALL_CHARS));
  const combined = [...required, ...rest];

  // Fisher-Yates shuffle so the four guaranteed characters aren't always
  // sitting in the first four positions.
  for (let i = combined.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join('');
};

module.exports = { generateStrongPassword };
