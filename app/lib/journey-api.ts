import { API_BASE_URL } from '@/constants/config';

// The colour bucket a status renders with. Each sub-step has its own
// status values ("booked", "loan_sanctioned", ...) — the app only ever
// shows their label + tone, both sent by the server.
export type JourneyStageStatus = 'pending' | 'in_progress' | 'completed' | 'rejected';

export type JourneySubstep = {
  key: string;
  title: string;
  status: string;
  statusLabel: string;
  tone: JourneyStageStatus;
  updatedAt: string | null;
  // Staff remarks on this sub-step, oldest first.
  remarks?: JourneyRemark[];
};

// One staff remark on a stage. `byRole` is the team label ("Visa",
// "Admin", ...) — staff members' own names are never sent to the app.
export type JourneyRemark = {
  _id: string | null;
  text: string;
  byRole: string;
  createdAt: string | null;
};

// One of the 7 journey steps. `status` is derived from its sub-steps.
export type JourneyStage = {
  title: string;
  status: JourneyStageStatus;
  // Older servers (flat 21-stage journey) don't send this.
  substeps?: JourneySubstep[];
  // Oldest first. Older servers only send latestRemark.
  remarks?: JourneyRemark[];
  latestRemark: string | null;
  updatedAt: string | null;
};

export async function fetchMyJourney(token: string): Promise<JourneyStage[]> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/student/journey`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
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
