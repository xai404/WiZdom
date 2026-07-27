import type { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

const DashboardLayout = ({ title, subtitle, children }: DashboardLayoutProps) => {
  return (
    <div className="flex min-h-screen bg-brand-50">
      <Sidebar />
      <div className="flex-1">
        <header className="border-b border-brand-100 bg-white/80 px-6 py-5 backdrop-blur sm:px-10">
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </header>
        <main className="px-6 py-8 sm:px-10">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
