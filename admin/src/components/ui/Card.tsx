import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  glass?: boolean;
}

const Card = ({ children, glass = false, className, ...props }: CardProps) => (
  <div
    className={clsx(
      'rounded-2xl border shadow-(--shadow-soft)',
      glass
        ? 'border-white/60 bg-white/70 backdrop-blur-xl'
        : 'border-brand-100 bg-white',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export default Card;
