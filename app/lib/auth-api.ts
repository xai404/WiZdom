import { API_BASE_URL } from '@/constants/config';

export type ProfileAuditor = {
  id: string;
  name: string;
  role: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
  phone?: string;
  // Free-text batch/cohort label set by admin. When present it's the name
  // shown in the app's chat header (a group/team thread) instead of the
  // student's own name.
  groupName?: string;
  gender?: string;
  countryInterested?: string[];
  intakeMonth?: number;
  intakeYear?: number;
  course?: string;
  source?: string;
  profilePicture?: string | null;
  assignedCounsellor?: string;
  status?: string;
  paymentStatus?: 'Paid in Full' | 'Half Payment' | 'Free' | null;
  createdBy?: ProfileAuditor | null;
};

export type LoginResponse = {
  success: true;
  token: string;
  user: AuthUser;
};

// Thrown by fetchMe specifically when the SERVER rejected the session
// (expired/invalid token, or the account no longer exists) — distinct from
// a network/offline failure, so callers can tell "this session is actually
// dead, log out" apart from "couldn't reach the server, keep using the
// cached session".
export class AuthSessionInvalidError extends Error {}

// Re-validates a persisted token against the server on app launch — a
// restored session from SecureStore/localStorage otherwise trusts
// whatever was cached with zero server round-trip, so an account closed
// while the app was shut also stays "logged in" until some other request
// happens to 401. isActive on the returned user reflects the CURRENT
// server state (unlike the cached copy), so the caller can force a logout
// on a closed account even though the JWT itself is still valid.
export async function fetchMe(token: string, timeoutMs = 8000): Promise<AuthUser> {
  let response: Response;
  // Bound the wait: on app launch the caller blocks the loading screen on
  // this call, and a bare fetch on a captive-portal / half-open connection
  // hangs for the OS default (30-60s+). An abort surfaces as a network
  // failure so the caller falls back to the cached session.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
  } catch {
    throw new Error('Unable to reach the server. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401 || response.status === 403 || response.status === 404) {
    throw new AuthSessionInvalidError('Session no longer valid');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    throw new Error(data?.message || 'Could not verify session.');
  }

  return data.user as AuthUser;
}

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error('Unable to reach the server. Check your connection and try again.');
  }

  const data = await response.json().catch(() => null);

  // `data` is only null when the response body wasn't valid JSON at all —
  // e.g. the request landed on the wrong host/port (stale dev-server LAN IP)
  // and got an HTML error page back instead of the API. That's a
  // connectivity problem, not a bad password, so don't blame the credentials.
  if (data === null) {
    throw new Error('Unexpected response from the server. Check your connection and try again.');
  }

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || 'Invalid email or password.');
  }

  return data as LoginResponse;
}

// Student-initiated password reset (see the "Reset Password" row on the
// Profile screen) — generates and sets a brand new random password for the
// signed-in student, emails it to them, and returns it once so the app can
// show it immediately even if the email hasn't arrived yet.
export async function resetMyPassword(token: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/student/reset-password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error('Unable to reach the server. Check your connection and try again.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || 'Could not reset your password. Please try again.');
  }

  return data.password as string;
}
