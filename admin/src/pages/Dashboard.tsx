import { useEffect, useState } from 'react';
import { Users, UserCheck } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import StatCard from '../components/StatCard';
import { fetchDashboardStats } from '../api/dashboard';
import type { DashboardStats } from '../types';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
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
    <DashboardLayout title={`Welcome back, ${user?.name?.split(' ')[0] ?? 'Admin'}`} subtitle="Here's what's happening today.">
      {error && (
        <p className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Students"
          value={loading ? '—' : stats?.totalStudents ?? 0}
          icon={Users}
        />
        <StatCard
          label="Active Students"
          value={loading ? '—' : stats?.activeStudents ?? 0}
          icon={UserCheck}
        />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
