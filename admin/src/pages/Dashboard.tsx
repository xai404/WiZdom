import { useAuth } from '../context/AuthContext';
import SuperAdminDashboard from './dashboards/SuperAdminDashboard';
import SimpleDashboard from './dashboards/SimpleDashboard';

const Dashboard = () => {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === 'super_admin') {
    return <SuperAdminDashboard />;
  }

  // counsellor, application_team, editing_team all get the same simple dashboard for now
  return <SimpleDashboard />;
};

export default Dashboard;