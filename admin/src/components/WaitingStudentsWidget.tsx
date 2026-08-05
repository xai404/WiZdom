import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { relativeTime } from './students/JourneyTab';
import type { WaitingStudent } from '../types';

interface WaitingStudentsWidgetProps {
  students: WaitingStudent[] | undefined;
  loading: boolean;
}

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
        {students.map((s) => (
          <Link
            key={s.id}
            to="/students"
            state={{ id: s.id }}
            className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-red-50/60"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
              <Clock size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{s.name}</p>
              <p className="truncate text-xs text-slate-400">{s.responsibleDepartment ?? 'Unassigned'} Team</p>
            </div>
            <span className="shrink-0 text-xs font-medium text-red-600">
              {s.awaitingSince ? `Waiting ${relativeTime(s.awaitingSince)}` : 'Waiting'}
            </span>
          </Link>
        ))}
      </div>
    )}
  </div>
);

export default WaitingStudentsWidget;
