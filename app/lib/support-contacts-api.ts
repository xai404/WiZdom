import { API_BASE_URL } from '@/constants/config';
import type { SupportContact } from '@/constants/contacts';

// Used by the Login screen's "Call Helpline" button — no token exists yet,
// so this hits the one unauthenticated endpoint that just returns the
// super admin's number.
export async function fetchHelplineContact(): Promise<SupportContact> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/student/helpline`);
  } catch {
    throw new Error('Unable to reach the server. Check your connection and try again.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || 'Could not load the helpline number right now.');
  }

  return { key: 'helpline', label: 'Admin Helpline', name: data.contact.name, phone: data.contact.phone };
}

// Post-login call picker — WiZdom (super admin), Editing Team, Application Team.
export async function fetchSupportContacts(token: string): Promise<SupportContact[]> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/student/support-contacts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error('Unable to reach the server. Check your connection and try again.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || 'Could not load support contacts right now.');
  }

  return data.contacts as SupportContact[];
}
