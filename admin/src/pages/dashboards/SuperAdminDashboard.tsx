import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserPlus, Eye, Pencil, KeyRound, TrendingUp, Sparkles, GraduationCap } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DashboardLayout from '../../components/DashboardLayout';
import WaitingStudentsWidget from '../../components/WaitingStudentsWidget';
import { fetchDashboardStats } from '../../api/dashboard';
import { fetchEmployees } from '../../api/employees';
import { fetchStudents } from '../../api/students';
import { Avatar, Badge, EMPLOYEE_ROLE_TONE, STUDENT_STATUS_TONE } from '../../components/ui';
import type { DashboardStats, Employee, Student } from '../../types';
import { useAuth } from '../../context/AuthContext';

const quickActions = [
  {
    to: '/employees/new',
    label: 'Add Employee',
    icon: UserPlus,
    gradient: 'bg-brand-500',
  },
  {
    to: '/employees',
    label: 'View Employees',
    icon: Eye,
    gradient: 'bg-brand-500',
  },
  {
    to: '/employees?edit=true',
    label: 'Edit Employee',
    icon: Pencil,
    gradient: 'bg-brand-500',
  },
  {
    to: '/employees?reset=true',
    label: 'Reset Password',
    icon: KeyRound,
    gradient: 'bg-brand-500',
  },
];

const CHART_COLORS = ['#0049B7', '#3B82F6', '#5f97fa', '#8bb4fd', '#003a92', '#b9d2ff'];
const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentStudents, setRecentStudents] = useState<Student[]>([]);
  const [recentEmployees, setRecentEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch(() => setError('Could not load dashboard stats.'))
      .finally(() => setLoading(false));

    fetchStudents({ limit: 5 })
      .then((res) => setRecentStudents(res.data))
      .catch(() => {});

    fetchEmployees({ limit: 5 })
      .then((res) => setRecentEmployees(res.data))
      .catch(() => {});
  }, []);

  return (
    <DashboardLayout
      title={`Welcome back, ${user?.name?.split(' ')[0] ?? 'Admin'}`}
      subtitle="Here's what's happening today."
    >
      {error && (
        <p className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

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
            <h2 className="text-2xl font-bold sm:text-3xl">Your team at a glance</h2>
            <p className="mt-1 text-brand-50/90">Track headcount, departments, and take action — all in one place.</p>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-5xl font-extrabold tabular-nums">
              {loading ? '—' : stats?.totalEmployees ?? 0}
            </p>
            <p className="text-sm text-brand-100">Total Employees</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-2xl border border-brand-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-500/20 blur-2xl transition-transform group-hover:scale-125" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Employees</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {loading ? '—' : stats?.totalEmployees ?? 0}
              </p>
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-brand-600">
                <TrendingUp size={14} /> Across all teams
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/30">
              <Users size={22} />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-brand-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-500/20 blur-2xl transition-transform group-hover:scale-125" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Departments</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {loading ? '—' : stats?.byDepartment?.length ?? 0}
              </p>
              <p className="mt-2 text-xs font-medium text-brand-600">Active teams</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/30">
              <Sparkles size={22} />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-brand-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-500/20 blur-2xl transition-transform group-hover:scale-125" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Largest Team</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {loading
                  ? '—'
                  : stats?.byDepartment?.length
                  ? [...stats.byDepartment].sort((a, b) => b.count - a.count)[0]?.department
                  : '—'}
              </p>
              <p className="mt-2 text-xs font-medium text-brand-600">Top headcount</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/30">
              <TrendingUp size={22} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <WaitingStudentsWidget students={stats?.waitingStudents} loading={loading} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Employees by Team */}
        <div className="relative overflow-hidden rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
          <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-linear-to-br from-brand-100 to-blue-100 blur-3xl" />
          <h2 className="relative mb-4 text-base font-semibold text-slate-900">Employees by Team</h2>
          {loading ? (
            <p className="relative text-sm text-slate-400">Loading…</p>
          ) : stats?.byDepartment?.length ? (
            <div className="relative h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.byDepartment}
                    dataKey="count"
                    nameKey="department"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    cornerRadius={6}
                  >
                   {stats.byDepartment.map((_: unknown, index: number) => (
                      <Cell
                        key={index}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        stroke="white"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="relative text-sm text-slate-400">No employees yet.</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {quickActions.map(({ to, label, icon: Icon, gradient }) => (
              <Link
                key={label}
                to={to}
                className="group flex items-center gap-3 rounded-xl border border-brand-100 px-4 py-4 text-sm font-medium text-slate-700 transition-all hover:-translate-y-0.5 hover:border-transparent hover:shadow-md"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${gradient} text-white shadow-md transition-transform group-hover:scale-110`}
                >
                  <Icon size={18} />
                </div>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Recent Students */}
        <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Recent Students</h2>
            <Link to="/students" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              View all
            </Link>
          </div>
          {recentStudents.length === 0 ? (
            <p className="text-sm text-slate-400">No students yet.</p>
          ) : (
            <div className="space-y-1">
              {recentStudents.map((s) => (
                <Link
                  key={s.id}
                  to="/students"
                  state={{ id: s.id }}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-slate-50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <GraduationCap size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{s.name}</p>
                    <p className="truncate text-xs text-slate-400">{s.email}</p>
                  </div>
                  <Badge tone={STUDENT_STATUS_TONE[s.status ?? 'Active']}>{s.status ?? 'Active'}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Employees */}
        <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Recent Employees</h2>
            <Link to="/employees" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              View all
            </Link>
          </div>
          {recentEmployees.length === 0 ? (
            <p className="text-sm text-slate-400">No employees yet.</p>
          ) : (
            <div className="space-y-1">
              {recentEmployees.map((emp) => (
                <Link
                  key={emp.id}
                  to="/admin/employees/view"
                  state={{ id: emp.id }}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-slate-50"
                >
                  <Avatar name={emp.name} src={emp.profilePicture} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{emp.name}</p>
                    <p className="truncate text-xs text-slate-400">{emp.department}</p>
                  </div>
                  <Badge tone={EMPLOYEE_ROLE_TONE[emp.role ?? 'staff']}>{emp.role ?? 'staff'}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
export default SuperAdminDashboard;