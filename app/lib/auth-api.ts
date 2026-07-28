import { API_BASE_URL } from '@/constants/config';

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

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || 'Invalid email or password.');
  }

  return data as LoginResponse;
}
