import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/students', label: 'Students', icon: Users },
];

const Sidebar = () => {
  const { logout, user } = useAuth();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-brand-900 text-brand-50">
      <div className="flex items-center gap-2 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white">
          <GraduationCap size={20} />
        </div>
        <span className="text-lg font-semibold tracking-tight text-white">WiZdom</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-brand-100 hover:bg-brand-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-brand-800 px-3 py-4">
        <div className="mb-2 truncate px-4 text-xs text-brand-300">
          Signed in as <span className="font-medium text-brand-100">{user?.name}</span>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-brand-100 transition-colors hover:bg-red-500/20 hover:text-red-200"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
