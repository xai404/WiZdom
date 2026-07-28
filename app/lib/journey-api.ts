import { API_BASE_URL } from '@/constants/config';

export type JourneyStageStatus = 'pending' | 'in_progress' | 'completed';

export type JourneyStage = {
  title: string;
  status: JourneyStageStatus;
  updatedAt: string | null;
};

export async function fetchMyJourney(token: string): Promise<JourneyStage[]> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/student/journey`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error('Unable to reach the server. Check your connection and try again.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || 'Unable to load your journey right now.');
  }

  return data.journey as JourneyStage[];
}
