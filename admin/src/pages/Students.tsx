import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Search, Eye, Pencil, Trash2 } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { fetchStudents, deleteStudent } from '../api/students';
import { useAuth } from '../context/AuthContext';
import type { Student } from '../types';

const Students = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [intakeYearFilter, setIntakeYearFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    setLoading(true);
    fetchStudents()
      .then(setStudents)
      .catch(() => setError('Could not load students.'))
      .finally(() => setLoading(false));
  }, []);

  const courses = useMemo(
    () => Array.from(new Set(students.map((s) => s.course).filter(Boolean))) as string[],
    [students]
  );

  const intakeYears = useMemo(
    () =>
      Array.from(new Set(students.map((s) => s.intakeYear).filter(Boolean)))
        .sort((a, b) => (b as number) - (a as number)) as number[],
    [students]
  );

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        search.trim() === '' ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase());

      const matchesCourse = courseFilter === 'all' || s.course === courseFilter;

      const matchesIntakeYear =
        intakeYearFilter === 'all' || String(s.intakeYear) === intakeYearFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && s.isActive) ||
        (statusFilter === 'inactive' && !s.isActive);

      return matchesSearch && matchesCourse && matchesIntakeYear && matchesStatus;
    });
  }, [students, search, courseFilter, intakeYearFilter, statusFilter]);

  const hasActiveFilters =
    search.trim() !== '' || courseFilter !== 'all' || intakeYearFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setCourseFilter('all');
    setIntakeYearFilter('all');
    setStatusFilter('all');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    setDeletingId(id);
    try {
      await deleteStudent(id);
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setError('Could not delete student.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = () => {
    alert('Editing students isn\'t available yet — this needs a backend update endpoint first.');
  };

  return (
    <DashboardLayout title="Students" subtitle="View student details.">
      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="all">All courses</option>
            {courses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={intakeYearFilter}
            onChange={(e) => setIntakeYearFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="all">All intake years</option>
            {intakeYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="mb-5">
        <p className="text-sm text-slate-500">
          {loading
            ? 'Loading…'
            : `${filteredStudents.length} of ${students.length} student${students.length === 1 ? '' : 's'}`}
        </p>
      </div>

      {error && (
        <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-medium">Student Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Gender</th>
                <th className="px-5 py-3 font-medium">Country Interested</th>
                <th className="px-5 py-3 font-medium">Course</th>
                <th className="px-5 py-3 font-medium">Intake</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Last Login</th>
                <th className="px-5 py-3 font-medium">Created On</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-5 py-10 text-center text-slate-400">
                    Loading students…
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <GraduationCap size={28} />
                      <p className="text-sm">
                        {students.length === 0 ? 'No students found.' : 'No students match these filters.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-medium text-slate-800">{s.name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{s.email}</td>
                    <td className="px-5 py-3.5 text-slate-600">{s.phone || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-600">{s.gender || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {s.countryInterested && s.countryInterested.length > 0
                        ? s.countryInterested.join(', ')
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {s.course ? (
                        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                          {s.course}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {s.intakeMonth && s.intakeYear ? `${s.intakeMonth}/${s.intakeYear}` : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          s.isActive
                            ? 'bg-green-50 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          title="View"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-brand-600"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          title="Edit"
                          onClick={handleEdit}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-brand-600"
                        >
                          <Pencil size={16} />
                        </button>
                        {isSuperAdmin && (
                          <button
                            title="Delete"
                            onClick={() => handleDelete(s.id)}
                            disabled={deletingId === s.id}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Students;