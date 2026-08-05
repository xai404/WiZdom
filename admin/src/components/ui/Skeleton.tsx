import clsx from 'clsx';

const Skeleton = ({ className }: { className?: string }) => (
  <div
    className={clsx(
      'animate-pulse rounded-lg bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:200%_100%]',
      className
    )}
  />
);

export default Skeleton;
