import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

interface DashboardLayoutProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

const DashboardLayout = ({ title, subtitle, children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-linear-to-br from-brand-50 via-white to-brand-50">
      <TopBar />
      {title && (
        <header className="border-b border-white/60 bg-white/70 px-6 py-5 backdrop-blur-xl sm:px-10">
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </motion.div>
        </header>
      )}
      <main className="px-6 pt-6 pb-24 sm:px-10">{children}</main>
      <BottomNav />
    </div>
  );
};

export default DashboardLayout;
