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
  gender?: string;
  countryInterested?: string[];
  intakeMonth?: number;
  intakeYear?: number;
  course?: string;
  source?: string;
  profilePicture?: string | null;
  assignedCounsellor?: string;
  status?: string;
  createdBy?: ProfileAuditor | null;
};

export type LoginResponse = {
  success: true;
  token: string;
  user: AuthUser;
};

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
