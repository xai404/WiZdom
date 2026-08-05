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

export const updateMyProfile = async (payload: { name: string; phone: string; profilePicture?: File | null }) => {
  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('phone', payload.phone);
  if (payload.profilePicture) formData.append('profilePicture', payload.profilePicture);

  const { data } = await apiClient.patch<MeResponse>('/auth/me', formData);
  return data.user;
};
