import { useEffect, useState } from 'react';
import { GraduationCap, Sparkles } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import WaitingStudentsWidget from '../../components/WaitingStudentsWidget';
import { fetchDashboardStats } from '../../api/dashboard';
import type { DashboardStats } from '../../types';
import { useAuth } from '../../context/AuthContext';

const SimpleDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch(() => setError('Could not load dashboard stats.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout
      title={`Welcome back, ${user?.name?.split(' ')[0] ?? ''}`}
      subtitle="Here's what's happening today."
    >
      {error && <p className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      {/* Hero banner */}
      <div className="relative mb-8 overflow-hidden rounded-3xl bg-brand-600 p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-brand-300/20 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-brand-100">
              <Sparkles size={18} />
              <span className="text-sm font-medium uppercase tracking-wider">Live overview</span>
            </div>
            <h2 className="text-2xl font-bold sm:text-3xl">Students at a glance</h2>
            <p className="mt-1 text-brand-50/90">A quick pulse on the admissions pipeline you support.</p>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-5xl font-extrabold tabular-nums">{loading ? '—' : stats?.totalStudents ?? 0}</p>
            <p className="text-sm text-brand-100">Total Students</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="group relative overflow-hidden rounded-2xl border border-brand-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-500/20 blur-2xl transition-transform group-hover:scale-125" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Students</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{loading ? '—' : stats?.totalStudents ?? 0}</p>
              <p className="mt-2 text-xs font-medium text-brand-600">Across the pipeline</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/30">
              <GraduationCap size={22} />
            </div>
          </div>
        </div>

        <WaitingStudentsWidget students={stats?.waitingStudents} loading={loading} />
      </div>
    </DashboardLayout>
  );
};

export default SimpleDashboard;
