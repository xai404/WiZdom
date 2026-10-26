import { ArrowLeft, GraduationCap, LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { useVisibleNavItems } from './BottomNav';

interface TopBarProps {
  // Show the main nav links here — for full-screen pages that hide BottomNav.
  showNav?: boolean;
}

const TopBar = ({ showNav = false }: TopBarProps) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const navItems = useVisibleNavItems();

  return (
    <div
      className={clsx(
        'sticky top-0 z-50 flex items-center justify-between border-b border-brand-100/70 bg-white/80 px-4 backdrop-blur-xl sm:px-6',
        // Full-screen pages get a slimmer bar to leave more room below.
        showNav ? 'py-1.5' : 'py-3'
      )}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm shadow-brand-500/30">
          <GraduationCap size={18} />
        </div>
        <span className="text-base font-semibold tracking-tight text-slate-900">WiZdom</span>
      </div>
      {showNav && (
        <nav className="flex items-center gap-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                )
              }
            >
              <Icon size={17} />
              <span className="hidden md:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
      )}
      <div className="flex items-center gap-1">
        <NotificationBell variant="dark" />
        <button
          onClick={logout}
          aria-label="Logout"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
};

export default TopBar;
