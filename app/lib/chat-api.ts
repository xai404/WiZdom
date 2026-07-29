import { API_BASE_URL } from '@/constants/config';

export type MessageSender = 'admin' | 'student';

export type ChatMessage = {
  _id: string;
  sender: MessageSender;
  senderName: string;
  text: string;
  stage: string | null;
  readByStudent: boolean;
  createdAt: string;
};

export async function fetchMyChat(token: string): Promise<ChatMessage[]> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/student/chat`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error('Unable to reach the server. Check your connection and try again.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || 'Unable to load your messages right now.');
  }

  return data.messages as ChatMessage[];
}

export async function postChatReply(
  token: string,
  payload: { text: string; stage?: string | null }
): Promise<ChatMessage> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/student/chat/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: payload.text, stage: payload.stage ?? null }),
    });
  } catch {
    throw new Error('Unable to reach the server. Check your connection and try again.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || 'Unable to send your message right now.');
  }

  return data.message as ChatMessage;
}

export async function markChatRead(token: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/student/chat/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Best-effort — an unread badge lingering a bit longer isn't worth surfacing an error for.
  }
}
