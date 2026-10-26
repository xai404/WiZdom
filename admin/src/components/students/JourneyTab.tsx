import { useState } from 'react';
import { Check, ChevronDown, Lock, MessageSquareText, Send, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import type { JourneyRemark, JourneyStage, JourneyStageStatus, JourneySubstep } from '../../types';

// Pending is the common case, so it renders in neutral grey in this tab
// (step header + sub-step dropdowns) — colour is kept for real movement.
const PENDING_QUIET = { dot: 'bg-slate-300', text: 'text-slate-500' };

const STATUS_META: Record<
  JourneyStageStatus,
  {
    label: string;
    dot: string;
    text: string;
    bg: string;
    border: string;
    bar: string;
  }
> = {
  pending: {
    label: 'Pending',
    dot: 'bg-red-500',
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    bar: 'bg-red-400',
  },
  in_progress: {
    label: 'In Progress',
    dot: 'bg-yellow-400',
    text: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    bar: 'bg-yellow-400',
  },
  completed: {
    label: 'Completed',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    bar: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    dot: 'bg-rose-600',
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    bar: 'bg-rose-500',
  },
};

const relativeTime = (iso: string | null) => {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

interface JourneyTabProps {
  journey: JourneyStage[];
  // Sets one sub-step's status (`substepKey` = JourneySubstep.key).
  onStatusChange: (substepKey: string, status: string) => Promise<void>;
  // Adds / deletes a step remark (stored on the step, NOT sent to the chat).
  onAddRemark: (title: string, text: string) => Promise<void>;
  onDeleteRemark: (remarkId: string) => Promise<void>;
  // Closed accounts reject journey writes server-side (adminJourneyController)
  // too — this just disables the controls so nobody hits save and gets a 403.
  isClosed: boolean;
}

// Compact accordion: one header row per step, only the current step (first
// one not yet completed) open by default so the tab isn't a wall of controls.
const JourneyTab = ({ journey, onStatusChange, onAddRemark, onDeleteRemark, isClosed }: JourneyTabProps) => {
  const currentIndex = journey.findIndex((s) => s.status !== 'completed');
  const [open, setOpen] = useState<Set<string>>(() => new Set(currentIndex >= 0 ? [journey[currentIndex].title] : []));
  const doneCount = journey.filter((s) => s.status === 'completed').length;

  const toggle = (title: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });

  return (
    <div className="space-y-3">
      {isClosed && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500">
          <Lock size={14} className="shrink-0 text-slate-400" />
          This student's account is closed — journey progress can't be changed.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {journey.length > 0 && (
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-slate-500">Overall progress</span>
              <span className="font-semibold text-slate-700">
                {doneCount}/{journey.length} steps
              </span>
            </div>
            <div className="mt-2 flex gap-1">
              {journey.map((s) => (
                <span
                  key={s.title}
                  title={`${s.title} · ${STATUS_META[s.status].label}`}
                  className={clsx(
                    'h-1 flex-1 rounded-full',
                    s.status === 'pending' ? 'bg-slate-200' : STATUS_META[s.status].bar
                  )}
                />
              ))}
            </div>
          </div>
        )}
        {journey.map((stage, index) => (
          <StepSection
            key={stage.title}
            stage={stage}
            index={index}
            isOpen={open.has(stage.title)}
            isCurrent={index === currentIndex}
            onToggle={() => toggle(stage.title)}
            onStatusChange={onStatusChange}
            onAddRemark={onAddRemark}
            onDeleteRemark={onDeleteRemark}
            isClosed={isClosed}
          />
        ))}
      </div>
    </div>
  );
};

const StepSection = ({
  stage,
  index,
  isOpen,
  isCurrent,
  onToggle,
  onStatusChange,
  onAddRemark,
  onDeleteRemark,
  isClosed,
}: {
  stage: JourneyStage;
  index: number;
  isOpen: boolean;
  isCurrent: boolean;
  onToggle: () => void;
  onStatusChange: (substepKey: string, status: string) => Promise<void>;
  onAddRemark: (title: string, text: string) => Promise<void>;
  onDeleteRemark: (remarkId: string) => Promise<void>;
  isClosed: boolean;
}) => {
  const meta = stage.status === 'pending' ? { ...STATUS_META.pending, ...PENDING_QUIET } : STATUS_META[stage.status];
  const done = stage.substeps.filter((s) => s.tone === 'completed').length;
  const remarkCount =
    (stage.remarks?.length ?? 0) + stage.substeps.reduce((n, sub) => n + (sub.remarks?.length ?? 0), 0);

  return (
    <section className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50/70"
      >
        <span
          className={clsx(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
            stage.status === 'completed'
              ? 'bg-emerald-500 text-white'
              : isCurrent
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-500'
          )}
        >
          {stage.status === 'completed' ? <Check size={13} strokeWidth={3} /> : index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-800">{stage.title}</span>
          <span className="block truncate text-[11px] text-slate-400">
            {done}/{stage.substeps.length} done
            {remarkCount > 0 && ` · ${remarkCount} remark${remarkCount === 1 ? '' : 's'}`}
            {stage.updatedAt && ` · ${relativeTime(stage.updatedAt)}`}
          </span>
        </span>
        <span className={clsx('hidden shrink-0 items-center gap-1.5 text-xs font-medium min-[420px]:flex', meta.text)}>
          <span className={clsx('h-1.5 w-1.5 rounded-full', meta.dot)} />
          {meta.label}
        </span>
        <ChevronDown
          size={16}
          className={clsx('shrink-0 text-slate-300 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div className="space-y-3 pb-4 pl-13 pr-4">
          <div className="divide-y divide-slate-100">
            {stage.substeps.map((substep) => (
              <SubstepRow
                key={substep.key}
                substep={substep}
                onStatusChange={onStatusChange}
                onAddRemark={onAddRemark}
                onDeleteRemark={onDeleteRemark}
                isClosed={isClosed}
              />
            ))}
          </div>
          <RemarksPanel
            target={stage.title}
            remarks={stage.remarks ?? []}
            hint="Step remarks · visible to student"
            onAddRemark={onAddRemark}
            onDeleteRemark={onDeleteRemark}
            isClosed={isClosed}
          />
        </div>
      )}
    </section>
  );
};

const SubstepRow = ({
  substep,
  onStatusChange,
  onAddRemark,
  onDeleteRemark,
  isClosed,
}: {
  substep: JourneySubstep;
  onStatusChange: (substepKey: string, status: string) => Promise<void>;
  onAddRemark: (title: string, text: string) => Promise<void>;
  onDeleteRemark: (remarkId: string) => Promise<void>;
  isClosed: boolean;
}) => {
  const [saving, setSaving] = useState(false);
  const remarks = substep.remarks ?? [];
  const [showRemarks, setShowRemarks] = useState(false);
  const meta = substep.tone === 'pending' ? { ...STATUS_META.pending, ...PENDING_QUIET } : STATUS_META[substep.tone];

  const handleStatus = async (status: string) => {
    if (status === substep.status || saving) return;
    setSaving(true);
    try {
      await onStatusChange(substep.key, status);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-1.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-slate-700">{substep.title}</p>
          {substep.updatedAt && <p className="text-[11px] text-slate-400">{relativeTime(substep.updatedAt)}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {(remarks.length > 0 || !isClosed) && (
            <button
              type="button"
              onClick={() => setShowRemarks((v) => !v)}
              aria-expanded={showRemarks}
              title={remarks.length ? `${remarks.length} remark${remarks.length === 1 ? '' : 's'}` : 'Add a remark'}
              className={clsx(
                'flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium transition hover:bg-slate-100',
                showRemarks || remarks.length ? 'text-brand-600' : 'text-slate-300 hover:text-slate-500'
              )}
            >
              <MessageSquareText size={13} />
              {remarks.length > 0 && remarks.length}
            </button>
          )}
          {/* Status dropdown — coloured dot + label, no box until hovered. */}
          <div className="relative">
            <span
              className={clsx(
                'pointer-events-none absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full',
                meta.dot
              )}
            />
            <select
              value={substep.status}
              disabled={saving || isClosed}
              onChange={(e) => handleStatus(e.target.value)}
              aria-label={`${substep.title} status`}
              className={clsx(
                'cursor-pointer appearance-none rounded-md bg-transparent py-1 pl-5 pr-6 text-xs font-medium outline-none transition',
                'hover:bg-slate-100 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60',
                meta.text
              )}
            >
              {substep.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>
      </div>
      {showRemarks && (
        <div className="mb-1 mt-1.5">
          <RemarksPanel
            target={substep.key}
            remarks={remarks}
            onAddRemark={onAddRemark}
            onDeleteRemark={onDeleteRemark}
            isClosed={isClosed}
            alwaysOpen
          />
        </div>
      )}
    </div>
  );
};

// A remark thread for one step or sub-step (`target` = step title or
// sub-step key). Any staff member can add to it; each remark shows who
// wrote it. Delete: its author, or an admin.
const RemarksPanel = ({
  target,
  remarks,
  hint,
  onAddRemark,
  onDeleteRemark,
  isClosed,
  alwaysOpen = false,
}: {
  target: string;
  remarks: JourneyRemark[];
  hint?: string;
  onAddRemark: (title: string, text: string) => Promise<void>;
  onDeleteRemark: (remarkId: string) => Promise<void>;
  isClosed: boolean;
  alwaysOpen?: boolean;
}) => {
  const { user } = useAuth();
  const isPrivileged = user?.role === 'super_admin' || user?.role === 'admin';
  const [showRemarks, setShowRemarks] = useState(alwaysOpen || remarks.length > 0);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAddRemark = async () => {
    if (!draft.trim() || adding) return;
    setAdding(true);
    try {
      await onAddRemark(target, draft.trim());
      setDraft('');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteRemark = async (remark: JourneyRemark) => {
    if (!remark._id || deletingId) return;
    if (!window.confirm('Delete this remark? The student will no longer see it.')) return;
    setDeletingId(remark._id);
    try {
      await onDeleteRemark(remark._id);
    } finally {
      setDeletingId(null);
    }
  };

  if (!showRemarks) {
    if (isClosed && remarks.length === 0) return null;
    return (
      <button
        type="button"
        onClick={() => setShowRemarks(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700"
      >
        <MessageSquareText size={13} />
        {remarks.length ? `Step remarks (${remarks.length})` : 'Add a step remark'}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {hint && <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{hint}</p>}

      {remarks.map((remark) => {
        const canDelete = !isClosed && (isPrivileged || remark.byId === user?.id);
        return (
          <div key={remark._id} className="group border-l-2 border-slate-200 py-0.5 pl-3">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-600">{remark.byName || 'Staff'}</span>
                {remark.byRole && ` · ${remark.byRole}`}
                {remark.createdAt && ` · ${relativeTime(remark.createdAt)}`}
              </p>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => handleDeleteRemark(remark)}
                  disabled={deletingId === remark._id}
                  title="Delete remark"
                  className="-m-1 shrink-0 rounded-md p-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100 disabled:opacity-50"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <p className="mt-0.5 whitespace-pre-line break-words text-sm leading-relaxed text-slate-600">
              {remark.text}
            </p>
          </div>
        );
      })}

      {!isClosed && (
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddRemark();
              }
            }}
            rows={Math.min(Math.max(draft.split('\n').length, 1), 6)}
            placeholder="Write a remark…"
            className="min-w-0 flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="button"
            onClick={handleAddRemark}
            disabled={!draft.trim() || adding}
            title="Add remark"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400"
          >
            <Send size={15} />
          </button>
        </div>
      )}
    </div>
  );
};

export { STATUS_META, relativeTime };
export default JourneyTab;
