import { API_BASE_URL } from '@/constants/config';

export type MessageSender = 'admin' | 'student';

export type ChatMessage = {
  _id: string;
  sender: MessageSender;
  senderName: string;
  // Student-facing label ("Admin", "Counselling", "Editing"...) for
  // sender:'admin' messages — shown instead of senderName so an individual
  // staff member's personal name is never surfaced in the app.
  senderRole: string | null;
  text: string;
  stage: string | null;
  readByStudent: boolean;
  // Whether staff have read this message — only meaningful for messages the
  // student themselves sent.
  readByAdmin: boolean;
  // True once every OTHER participant (every active staff account) has
  // read this message — the WhatsApp-group "blue tick" condition. Computed
  // fresh per request server-side; this (not readByAdmin) drives the tick
  // color, since readByAdmin alone only means "read by at least one staff
  // member", not "read by everyone".
  fullyRead: boolean;
  // Staff-only bookmark, read-only here — a student can see which messages
  // were pinned as important, but can't pin/unpin themselves.
  pinned: boolean;
  // Soft-deleted by staff — `text` is still present in the payload (kept
  // for the audit trail server-side) but must never be rendered; show a
  // tombstone instead, same as the Admin Panel does.
  deleted: boolean;
  // Structural reply target's message id, resolved client-side against the
  // already-loaded thread (mirrors the Admin Panel's approach) so a later
  // delete of the quoted message is reflected live.
  replyTo: string | null;
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
  payload: { text: string; stage?: string | null; replyTo?: string | null }
): Promise<ChatMessage> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/student/chat/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: payload.text, stage: payload.stage ?? null, replyTo: payload.replyTo ?? null }),
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
