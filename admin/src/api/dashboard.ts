import apiClient from './client';
import type { DashboardStats } from '../types';

interface StatsResponse {
  success: boolean;
  stats: DashboardStats;
}

export const fetchDashboardStats = async () => {
  const { data } = await apiClient.get<StatsResponse>('/dashboard/stats');
  return data.stats;
};
