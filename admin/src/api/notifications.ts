import api from './client';
import type { AppNotification } from '../types';

export interface NotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
}

export const fetchMyNotifications = async (): Promise<NotificationsResult> => {
  const res = await api.get('/notifications');
  return { notifications: res.data.notifications, unreadCount: res.data.unreadCount };
};

export const markNotificationRead = async (id: string): Promise<void> => {
  await api.patch(`/notifications/${id}/read`);
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await api.patch('/notifications/read-all');
};
