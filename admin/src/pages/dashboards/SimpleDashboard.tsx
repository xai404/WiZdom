import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

const SimpleDashboard = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout
      title={`Welcome back, ${user?.name?.split(' ')[0] ?? ''}`}
      subtitle="Here's what's happening today."
    >
      <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          Your dashboard for this role is coming soon. For now, use the sidebar to navigate.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default SimpleDashboard;