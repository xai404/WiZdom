import { API_BASE_URL } from '@/constants/config';

export type NotificationType = 'stage_status' | 'remark' | 'message';

export type AppNotification = {
  _id: string;
  type: NotificationType;
  title: string;
  body: string;
  stage: string | null;
  read: boolean;
  createdAt: string;
};

export async function fetchMyNotifications(token: string): Promise<AppNotification[]> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/student/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error('Unable to reach the server. Check your connection and try again.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || 'Unable to load your notifications right now.');
  }

  return data.notifications as AppNotification[];
}

export async function markNotificationRead(token: string, id: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/student/notifications/${id}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Best-effort — same posture as chat-api's markChatRead.
  }
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/student/notifications/read-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Best-effort.
  }
}

export async function registerPushToken(token: string, pushToken: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/student/push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ token: pushToken }),
    });
  } catch {
    // Best-effort — a failed registration just means this device won't get
    // pushes until the next successful attempt (e.g. next app open).
  }
}
