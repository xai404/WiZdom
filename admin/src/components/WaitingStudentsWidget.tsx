import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { relativeTime } from './students/JourneyTab';
import type { WaitingStudent } from '../types';

interface WaitingStudentsWidgetProps {
  students: WaitingStudent[] | undefined;
  loading: boolean;
}

// Being "seen" by the tagged department never clears awaitingReply (see
// backend/controllers/adminChatController.js — only an actual reply does),
// so this list is already a true "nobody has answered yet" queue, not just
// "nobody has opened it yet". The only gap that lets a tagged student go
// quiet for hours is staff not glancing at this widget often enough — these
// tiers make how overdue something is visible at a glance (sorted oldest
// first already, from the backend), instead of every row reading identically
// urgent regardless of whether it's been 10 minutes or 10 hours.
const urgencyTier = (iso: string | null): 'ok' | 'warn' | 'overdue' => {
  if (!iso) return 'ok';
  const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (hours >= 6) return 'overdue';
  if (hours >= 2) return 'warn';
  return 'ok';
};

const TIER_STYLES = {
  ok: { badge: 'bg-red-50 text-red-600', dot: 'bg-red-50 text-red-500' },
  warn: { badge: 'bg-amber-50 text-amber-700 font-semibold', dot: 'bg-amber-50 text-amber-600' },
  overdue: { badge: 'bg-rose-100 text-rose-700 font-bold', dot: 'bg-rose-100 text-rose-600' },
} as const;

const WaitingStudentsWidget = ({ students, loading }: WaitingStudentsWidgetProps) => (
  <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
    <div className="mb-4 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <AlertTriangle size={16} className="text-red-500" />
        Waiting for Reply
      </h2>
      <Link to="/students" className="text-xs font-medium text-brand-600 hover:text-brand-700">
        Open Students
      </Link>
    </div>

    {loading ? (
      <p className="text-sm text-slate-400">Loading…</p>
    ) : !students || students.length === 0 ? (
      <div className="flex items-center gap-2 py-4 text-sm text-slate-400">
        <CheckCircle2 size={16} className="text-emerald-500" />
        Nothing waiting right now.
      </div>
    ) : (
      <div className="space-y-1">
        {students.map((s) => {
          const tier = urgencyTier(s.awaitingSince);
          const style = TIER_STYLES[tier];
          return (
            <Link
              key={s.id}
              to="/students"
              state={{ id: s.id }}
              className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-red-50/60"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.dot}`}>
                <Clock size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{s.name}</p>
                <p className="truncate text-xs text-slate-400">{s.responsibleDepartment ?? 'Unassigned'} Team</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${style.badge}`}>
                {s.awaitingSince ? `Waiting ${relativeTime(s.awaitingSince)}` : 'Waiting'}
              </span>
            </Link>
          );
        })}
      </div>
    )}
  </div>
);

export default WaitingStudentsWidget;
