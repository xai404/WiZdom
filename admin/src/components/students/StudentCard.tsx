import { motion } from 'framer-motion';
import { Pencil, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { Avatar, IconButton } from '../ui';
import { formatIntakeLine } from '../../utils/countryFlags';
import type { ResponseStatus, Student } from '../../types';

interface StudentCardProps {
  student: Student;
  selected: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const STATUS_DOT: Record<ResponseStatus, string> = {
  awaiting: 'bg-red-500',
  in_progress: 'bg-amber-400',
  resolved: 'bg-emerald-500',
};

const StudentCard = ({ student, selected, onSelect, onEdit, onDelete }: StudentCardProps) => {
  const status = student.responseStatus;
  const isAwaiting = status === 'awaiting';

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
      className={clsx(
        'group relative flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-3.5 text-left transition-all',
        selected
          ? 'border-brand-500 bg-linear-to-br from-brand-50 to-white shadow-(--shadow-panel) ring-2 ring-brand-100'
          : isAwaiting
            ? 'border-red-200 bg-red-50/40 shadow-(--shadow-soft) hover:shadow-(--shadow-panel)'
            : 'border-brand-100 bg-white shadow-(--shadow-soft) hover:border-brand-300 hover:shadow-(--shadow-panel)'
      )}
    >
      <div className="relative shrink-0">
        <Avatar name={student.name} size={44} />
        <span className={clsx('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white', STATUS_DOT[status])} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className={clsx('truncate text-sm text-slate-800', isAwaiting ? 'font-bold' : 'font-semibold')}>
            {student.name}
          </p>
          {isAwaiting && (
            <span className="inline-flex shrink-0 items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
              Awaiting Response
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">{formatIntakeLine(student)}</p>
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
