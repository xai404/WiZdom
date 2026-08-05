import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const Pagination = ({ meta, onPageChange }: { meta: PaginationMeta; onPageChange: (page: number) => void }) => {
  if (meta.total === 0) return null;

  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row">
      <p className="text-xs text-slate-500">
        Showing <span className="font-medium text-slate-700">{from}–{to}</span> of{' '}
        <span className="font-medium text-slate-700">{meta.total}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(meta.page - 1)}
          disabled={meta.page <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === meta.totalPages || Math.abs(p - meta.page) <= 1)
          .reduce<number[]>((acc, p) => {
            if (acc.length && p - acc[acc.length - 1] > 1) acc.push(-1);
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === -1 ? (
              <span key={`gap-${i}`} className="px-1 text-xs text-slate-400">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={clsx(
                  'flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium transition',
                  p === meta.page ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                {p}
              </button>
            )
          )}
        <button
          onClick={() => onPageChange(meta.page + 1)}
          disabled={meta.page >= meta.totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
