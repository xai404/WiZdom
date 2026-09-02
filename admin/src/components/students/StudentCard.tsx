import { motion } from 'framer-motion';
import { CalendarClock, Pencil, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { IconButton, PaymentStars } from '../ui';
import { formatIntakeBadge } from '../../utils/countryFlags';
import { getPipelineOutline } from '../../utils/pipelineStatus';
import type { ResponseStatus, Student } from '../../types';

interface StudentCardProps {
  student: Student;
  selected: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

// Binary by design: red means a message is awaiting reply right now,
// green covers every other state (in_progress and resolved alike).
const STATUS_DOT: Record<ResponseStatus, string> = {
  awaiting: 'bg-red-500',
  in_progress: 'bg-emerald-500',
  resolved: 'bg-emerald-500',
};

const StudentCard = ({ student, selected, onSelect, onEdit, onDelete }: StudentCardProps) => {
  const status = student.responseStatus;
  const isAwaiting = status === 'awaiting';
  const intake = formatIntakeBadge(student);
  const hasGroupName = !!student.groupName?.trim();
  // Card border always reflects account status / pipeline milestone
  // (see getPipelineOutline) — a pending message is surfaced via the dot
  // and the "Awaiting" badge next to the name, not by overriding the border.
  const pipelineOutline = getPipelineOutline(student);

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      title={pipelineOutline.label}
      className={clsx(
        'group relative flex w-full cursor-pointer items-center gap-3 rounded-2xl p-3.5 text-left transition-all',
        // Selection is shown via background + elevation, never by swapping
        // the border color — the border always stays the true
        // status/milestone color (see getPipelineOutline) whether or not
        // the card is selected.
        selected
          ? 'bg-linear-to-br from-brand-50 to-white shadow-(--shadow-panel)'
          : clsx(isAwaiting ? 'bg-red-50/40' : 'bg-white', 'shadow-(--shadow-soft) hover:shadow-(--shadow-panel)'),
        'ring-1',
        pipelineOutline.border,
        pipelineOutline.ring
      )}
    >
      <div className="relative shrink-0">
        {/* Intake month/year in place of a letter avatar — set in Edit
            Student's Intake Month/Year fields. Falls back to a calendar
            icon when intake isn't set yet, rather than a blank circle. */}
        <div
          style={{ width: 44, height: 44 }}
          className="flex shrink-0 flex-col items-center justify-center rounded-full bg-brand-100 leading-none text-brand-700 ring-2 ring-white"
        >
          {intake ? (
            <>
              <span className="text-[10.5px] font-bold">{intake.month}</span>
              <span className="text-[9px] font-medium opacity-80">&apos;{intake.year}</span>
            </>
          ) : (
            <CalendarClock size={16} />
          )}
        </div>
        <span className={clsx('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white', STATUS_DOT[status])} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className={clsx('truncate text-sm text-slate-800', isAwaiting ? 'font-bold' : 'font-semibold')}>
            {hasGroupName ? student.groupName : student.name}
          </p>
          {isAwaiting && (
            <span className="shrink-0 whitespace-nowrap rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
              Awaiting Response
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-slate-500">{hasGroupName ? student.name : student.email}</p>
          <PaymentStars paymentStatus={student.paymentStatus} />
        </div>
      </div>

      {(onEdit || onDelete) && (
        <div className="flex shrink-0 items-center gap-1">
          {onEdit && (
            <IconButton
              icon={<Pencil size={14} />}
              label="Edit student"
              tone="brand"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            />
          )}
          {onDelete && (
            <IconButton
              icon={<Trash2 size={14} />}
              label="Delete student"
              tone="danger"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            />
          )}
        </div>
      )}
    </motion.div>
  );
};

export default StudentCard;
