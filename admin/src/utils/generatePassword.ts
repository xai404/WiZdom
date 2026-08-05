// Ambiguous-looking characters (0/O, 1/l/I) are left out so a password
// read off-screen (or relayed verbally) isn't easily mistyped. Mirrors the
// algorithm in E:\CRM\backend\services\wizdomService.js exactly, swapping
// Node's crypto.randomInt for a Web Crypto equivalent (browsers have none).
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SPECIAL = '!@#$%^&*()-_=+';
const ALL_CHARS = UPPER + LOWER + DIGITS + SPECIAL;

// Uniform random integer in [0, max) via rejection sampling — avoids the
// modulo bias a plain `getRandomValues() % max` would introduce.
const randomInt = (max: number): number => {
  const range = 256 - (256 % max);
  const buffer = new Uint8Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= range);
  return value % max;
};

const randomChar = (chars: string) => chars[randomInt(chars.length)];

export const generateStrongPassword = (length = 14): string => {
  const required = [randomChar(UPPER), randomChar(LOWER), randomChar(DIGITS), randomChar(SPECIAL)];
  const rest = Array.from({ length: length - required.length }, () => randomChar(ALL_CHARS));
  const combined = [...required, ...rest];

  // Fisher-Yates shuffle so the four guaranteed characters aren't always
  // sitting in the first four positions.
  for (let i = combined.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join('');
};
