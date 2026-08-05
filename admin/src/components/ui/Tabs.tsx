import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export interface TabItem {
  key: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
  layoutId: string;
  className?: string;
}

const Tabs = ({ tabs, active, onChange, layoutId, className }: TabsProps) => (
  <div className={clsx('inline-flex items-center gap-1 rounded-2xl border border-brand-100 bg-white p-1', className)}>
    {tabs.map((tab) => {
      const isActive = tab.key === active;
      return (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={clsx(
            'relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors',
            isActive ? 'text-white' : 'text-slate-500 hover:text-slate-800'
          )}
        >
          {isActive && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 rounded-xl bg-brand-600 shadow-sm"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
          <span className="relative flex items-center gap-2">
            {tab.icon}
            {tab.label}
          </span>
        </button>
      );
    })}
  </div>
);

export default Tabs;
