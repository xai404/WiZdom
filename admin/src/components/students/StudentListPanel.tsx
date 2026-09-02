import { GraduationCap, Loader2, Plus } from 'lucide-react';
import { Button, SearchInput, Select, Skeleton } from '../ui';
import type { StudentMilestoneFilter } from '../../api/students';
import type { Student } from '../../types';
import StudentCard from './StudentCard';

// The single "Filter" dropdown above the list — same set on admin and
// employee accounts. Values match studentsController.getStudents' milestone
// param.
const MILESTONE_OPTIONS: { value: StudentMilestoneFilter; label: string }[] = [
  { value: 'documentation_completed', label: 'Documentation Completed' },
  { value: 'offer_received', label: 'Offer Received' },
  { value: 'visa_approved', label: 'Visa Approved' },
  { value: 'visa_rejected', label: 'Visa Rejected' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'closed', label: 'Closed' },
];

interface StudentListPanelProps {
  students: Student[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  milestone: StudentMilestoneFilter | '';
  onMilestoneChange: (value: StudentMilestoneFilter | '') => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit?: (student: Student) => void;
  onDeleteRequest?: (student: Student) => void;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
  onAddStudent: () => void;
}

// Fires onLoadMore once the scroll position gets within this many pixels of
// the bottom of the list, so the next page is fetched before the user
// actually hits the end (no visible pause).
const LOAD_MORE_THRESHOLD = 160;

const StudentListPanel = ({
  students,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  search,
  onSearchChange,
  milestone,
  onMilestoneChange,
  selectedId,
  onSelect,
  onEdit,
  onDeleteRequest,
  canEdit,
  canDelete,
  canCreate,
  onAddStudent,
}: StudentListPanelProps) => {
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (hasMore && !loadingMore && el.scrollHeight - el.scrollTop - el.clientHeight < LOAD_MORE_THRESHOLD) {
      onLoadMore();
    }
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="shrink-0 space-y-3 border-b border-brand-100/70 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-800">Students</h2>
          {canCreate && (
            <Button size="sm" icon={<Plus size={15} />} onClick={onAddStudent}>
              Add
            </Button>
          )}
        </div>
        <SearchInput value={search} onChange={onSearchChange} placeholder="Search by name or email…" />
        <Select
          aria-label="Filter students"
          value={milestone}
          onChange={(e) => onMilestoneChange(e.target.value as StudentMilestoneFilter | '')}
        >
          <option value="">All students</option>
          {MILESTONE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <div onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-400">
            <GraduationCap size={28} />
            <p className="text-sm">No students found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map((s) => (
              <StudentCard
                key={s.id}
                student={s}
                selected={s.id === selectedId}
                onSelect={() => onSelect(s.id)}
                onEdit={canEdit && onEdit ? () => onEdit(s) : undefined}
                onDelete={canDelete && onDeleteRequest ? () => onDeleteRequest(s) : undefined}
              />
            ))}
            {loadingMore && (
              <div className="flex items-center justify-center py-3 text-slate-400">
                <Loader2 size={16} className="animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentListPanel;
