import { API_BASE_URL } from '@/constants/config';

// Only departments with at least one active employee — tagging an
// unstaffed department (e.g. one with zero active employees) would open an
// "awaiting reply" that nothing on the backend can ever auto-resolve, since
// resolution requires a reply from an employee IN that department. See
// backend/controllers/employeesController.getActiveDepartments.
export async function fetchActiveDepartments(token: string): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/student/departments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) return [];
    return data.departments as string[];
  } catch {
    // Best-effort — the tag picker just shows nothing to pick if this
    // fails, same as it would for a genuinely empty result.
    return [];
  }
}
