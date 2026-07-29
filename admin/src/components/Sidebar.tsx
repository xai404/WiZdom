import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, GraduationCap, BookOpen, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'counsellor', 'application_team', 'editing_team'] },
  { to: '/employees', label: 'Employees', icon: Users, roles: ['super_admin'] },
  { to: '/students', label: 'Students', icon: BookOpen, roles: ['super_admin'] },
];

const Sidebar = () => {
  const { logout, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const visibleNavItems = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <>
      {/* Mobile top bar with hamburger */}
      <div className="flex items-center justify-between bg-brand-900 px-4 py-3 text-white lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500 text-white">
            <GraduationCap size={18} />
          </div>
          <span className="text-base font-semibold tracking-tight">WiZdom</span>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 hover:bg-brand-800"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Backdrop (mobile only, shown when sidebar is open) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
   <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-brand-900 text-brand-50">
        <div className="flex items-center justify-between gap-2 px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white">
              <GraduationCap size={20} />
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">WiZdom</span>
          </div>
          {/* Close button, mobile only */}
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            className="rounded-lg p-1 text-brand-100 hover:bg-brand-800 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
         {visibleNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setIsOpen(false)}
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
    </>
  );
};

export default Sidebar;