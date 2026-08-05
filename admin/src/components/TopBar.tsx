import { ArrowLeft, GraduationCap, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const TopBar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between border-b border-brand-100/70 bg-white/80 px-4 py-3 backdrop-blur-xl sm:px-6">
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
