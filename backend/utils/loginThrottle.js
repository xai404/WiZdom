// Per-account lockout, on top of the per-IP rate limit on /login.
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

const isLocked = (account) => Boolean(account.lockUntil && account.lockUntil.getTime() > Date.now());

const lockRemainingMinutes = (account) => Math.max(1, Math.ceil((account.lockUntil.getTime() - Date.now()) / 60000));

const registerFailedAttempt = async (account) => {
  account.failedLoginAttempts = (account.failedLoginAttempts || 0) + 1;
  if (account.failedLoginAttempts >= MAX_ATTEMPTS) {
    account.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
    account.failedLoginAttempts = 0;
  }
  await account.save({ validateModifiedOnly: true });
};

const clearFailedAttempts = (account) => {
  if (account.failedLoginAttempts) account.failedLoginAttempts = 0;
  if (account.lockUntil) account.lockUntil = null;
};

module.exports = { MAX_ATTEMPTS, isLocked, lockRemainingMinutes, registerFailedAttempt, clearFailedAttempts };
