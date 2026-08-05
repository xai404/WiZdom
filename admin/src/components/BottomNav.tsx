import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, BookOpen, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['super_admin', 'admin', 'manager', 'staff', 'co_admin'],
  },
  {
    to: '/employees',
    label: 'Employees',
    icon: Users,
    roles: ['super_admin', 'admin', 'manager', 'staff', 'co_admin'],
  },
  {
    to: '/students',
    label: 'Students',
    icon: BookOpen,
    roles: ['super_admin', 'admin', 'manager', 'staff', 'co_admin'],
  },
  {
    to: '/my-profile',
    label: 'Profile',
    icon: User,
    roles: ['super_admin', 'admin', 'manager', 'staff', 'co_admin'],
  },
];

// Instagram-style fixed footer nav — replaces the old left sidebar
// entirely, same items, same role filtering. Fixed to the viewport bottom
// so it never scrolls with page content; DashboardLayout reserves matching
// bottom padding on `main` so content never sits underneath it.
const BottomNav = () => {
  const { user } = useAuth();
  const visibleNavItems = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-100 bg-white/95 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {visibleNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className="relative flex flex-1 flex-col items-center gap-1 py-2.5">
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="bottomnav-active-dot"
                    className="absolute top-1 h-1 w-1 rounded-full bg-brand-600"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon size={22} className={isActive ? 'text-brand-600' : 'text-slate-400'} strokeWidth={isActive ? 2.4 : 2} />
                <span className={`text-[10px] font-medium ${isActive ? 'text-brand-600' : 'text-slate-400'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
