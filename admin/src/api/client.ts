import axios from 'axios';
import { API_BASE_URL, API_ORIGIN } from '../config/api';
import { disconnectSocket } from '../lib/socket';

export { API_ORIGIN };

export const TOKEN_STORAGE_KEY = 'wizdom_admin_token';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      disconnectSocket();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
