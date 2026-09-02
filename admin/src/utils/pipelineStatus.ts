import type { Student } from '../types';

export interface PipelineOutline {
  border: string;
  ring: string;
  label: string;
}

// Precedence (highest first): account status overrides pipeline progress,
// and within pipeline progress the FURTHEST-along completed milestone wins
// — e.g. a student with both Documentation and Offer Letters completed
// shows purple (Offer Received), not yellow. Everything short of these
// specific milestones (including "no journey progress yet") falls back to
// a neutral grey outline rather than no outline at all.
export function getPipelineOutline(student: Student): PipelineOutline {
  if (student.status === 'Closed') {
    return { border: 'border-2 border-red-500', ring: 'ring-red-100', label: 'Closed' };
  }
  if (student.status === 'Inactive') {
    return { border: 'border-2 border-blue-500', ring: 'ring-blue-100', label: 'Inactive' };
  }

  const stageStatus = (title: string) => student.journey?.find((s) => s.title === title)?.status;

  // "Visa Status Update" carries the visa outcome: completed = Approved,
  // rejected = Rejected (the 4th journey status). Rejected is checked first
  // so it wins over any earlier completed milestone.
  if (stageStatus('Visa Status Update') === 'rejected') {
    return { border: 'border-2 border-rose-600', ring: 'ring-rose-100', label: 'Visa Rejected' };
  }
  if (stageStatus('Visa Status Update') === 'completed') {
    return { border: 'border-2 border-green-500', ring: 'ring-green-100', label: 'Visa Approved' };
  }
  if (stageStatus('Offer Letters') === 'completed') {
    return { border: 'border-2 border-purple-500', ring: 'ring-purple-100', label: 'Offer Received' };
  }
  if (stageStatus('Documentation') === 'completed') {
    return { border: 'border-2 border-yellow-400', ring: 'ring-yellow-100', label: 'Documentation Completed' };
  }

  return { border: 'border-2 border-slate-300', ring: 'ring-slate-100', label: 'No Milestone Completed' };
}
