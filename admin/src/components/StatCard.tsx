import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: 'brand' | 'slate';
}

const StatCard = ({ label, value, icon: Icon, accent = 'brand' }: StatCardProps) => {
  const iconWrapClasses =
    accent === 'brand' ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-600';

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm shadow-brand-900/5 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconWrapClasses}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
