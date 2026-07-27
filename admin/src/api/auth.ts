import apiClient from './client';
import type { AuthUser } from '../types';

interface LoginResponse {
  success: boolean;
  token: string;
  user: AuthUser;
}

interface MeResponse {
  success: boolean;
  user: AuthUser;
}

export const loginRequest = async (email: string, password: string) => {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password });
  return data;
};

export const fetchCurrentUser = async () => {
  const { data } = await apiClient.get<MeResponse>('/auth/me');
  return data.user;
};
