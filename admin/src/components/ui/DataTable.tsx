import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import Card from './Card';
import Skeleton from './Skeleton';

export interface Column<T> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyIcon?: ReactNode;
  emptyLabel?: string;
  footer?: ReactNode;
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

function DataTable<T>({ columns, rows, rowKey, loading, emptyIcon, emptyLabel, footer }: DataTableProps<T>) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
              {columns.map((col) => (
                <th key={col.key} className={`px-5 py-3 font-medium ${alignClass[col.align ?? 'left']}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-5 py-4">
                      <Skeleton className="h-4 w-full max-w-[140px]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    {emptyIcon}
                    <p className="text-sm">{emptyLabel ?? 'Nothing here yet.'}</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <motion.tr
                  key={rowKey(row)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className="transition-colors hover:bg-brand-50/40"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-5 py-3.5 ${alignClass[col.align ?? 'left']}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </Card>
  );
}

export default DataTable;
