import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { deleteStudent, fetchStudents } from '../../api/students';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog } from '../ui';
import type { PaginationMeta } from '../ui';
import type { Student } from '../../types';
import StudentListPanel from './StudentListPanel';
import StudentDetailPanel from './StudentDetailPanel';

interface StudentsWorkspaceProps {
  selectedId: string | null;
}

const StudentsWorkspace = ({ selectedId }: StudentsWorkspaceProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const canManage = user?.role === 'super_admin' || user?.role === 'admin';

  const [successMessage, setSuccessMessage] = useState<string | null>(
    (location.state as { successMessage?: string } | null)?.successMessage ?? null
  );
  const [students, setStudents] = useState<Student[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Measured (not guessed) so the workspace always fills exactly down to the
  // bottom of the viewport regardless of header height, zoom level, or
  // window size — matches DashboardLayout main's own bottom padding (pb-24 =
  // 96px, reserved so content clears the fixed BottomNav).
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const top = containerRef.current?.getBoundingClientRect().top ?? 0;
      setHeight(Math.max(window.innerHeight - top - 96, 420));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Infinite scroll: page 1 replaces the list (fresh search or reload),
  // any later page appends onto it as the user scrolls near the bottom.
  const load = (targetPage: number) => {
    if (targetPage === 1) setLoading(true);
    else setLoadingMore(true);

    fetchStudents({ search, page: targetPage, limit: 20 })
      .then((res) => {
        setStudents((prev) => (targetPage === 1 ? res.data : [...prev, ...res.data]));
        setPagination(res.pagination);
      })
      .catch(() => setError('Could not load students.'))
      .finally(() => {
        if (targetPage === 1) setLoading(false);
        else setLoadingMore(false);
      });
  };

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  useEffect(() => setPage(1), [search]);

  const hasMore = pagination.page < pagination.totalPages;
  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    setPage((p) => p + 1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteStudent(deleteTarget.id);
      if (selectedId === deleteTarget.id) navigate('/students');
      setDeleteTarget(null);
      setPage(1);
      load(1);
    } catch {
      setError('Could not delete this student.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col" style={{ height: height ?? '80vh' }}>
      {successMessage && (
        <p className="mb-4 shrink-0 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}{' '}
          <button type="button" onClick={() => setSuccessMessage(null)} className="font-medium underline">
            Dismiss
          </button>
        </p>
      )}
      {error && (
        <p className="mb-4 shrink-0 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
        <div className={`min-h-0 w-full overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-(--shadow-panel) ${selectedId ? 'hidden lg:flex' : 'flex'}`}>
          <StudentListPanel
            students={students}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            search={search}
            onSearchChange={setSearch}
            selectedId={selectedId}
            onSelect={(id) => navigate('/students', { state: { id } })}
            onEdit={(s) => navigate('/students/edit', { state: { id: s.id } })}
            onDeleteRequest={setDeleteTarget}
            canEdit
            canDelete={canManage}
            canCreate
            onAddStudent={() => navigate('/students/new')}
          />
        </div>

        <div className={`min-h-0 w-full ${selectedId ? 'flex' : 'hidden lg:flex'}`}>
          {selectedId ? (
            <StudentDetailPanel
              studentId={selectedId}
              onBack={() => navigate('/students')}
              onStudentUpdated={(updated) =>
                setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
              }
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-brand-100 bg-white/50 text-slate-400">
              <GraduationCap size={32} />
              <p className="text-sm">Select a student to see their details.</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this student?"
        description={`${deleteTarget?.name} will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default StudentsWorkspace;
