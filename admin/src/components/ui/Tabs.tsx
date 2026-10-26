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
  // 'sm' for tight spots (e.g. the student detail header) — default unchanged.
  size?: 'md' | 'sm';
}

const Tabs = ({ tabs, active, onChange, layoutId, className, size = 'md' }: TabsProps) => (
  <div
    className={clsx(
      'inline-flex items-center gap-1 border border-brand-100 bg-white p-1',
      size === 'sm' ? 'rounded-xl' : 'rounded-2xl',
      className
    )}
  >
    {tabs.map((tab) => {
      const isActive = tab.key === active;
      return (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={clsx(
            'relative flex items-center font-medium transition-colors',
            size === 'sm' ? 'gap-1.5 rounded-lg px-3 py-1.5 text-[13px]' : 'gap-2 rounded-xl px-4 py-2 text-sm',
            isActive ? 'text-white' : 'text-slate-500 hover:text-slate-800'
          )}
        >
          {isActive && (
            <motion.span
              layoutId={layoutId}
              className={clsx('absolute inset-0 bg-brand-600 shadow-sm', size === 'sm' ? 'rounded-lg' : 'rounded-xl')}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
          <span className={clsx('relative flex items-center', size === 'sm' ? 'gap-1.5' : 'gap-2')}>
            {tab.icon}
            {tab.label}
          </span>
        </button>
      );
    })}
  </div>
);

export default Tabs;
