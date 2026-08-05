import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import clsx from 'clsx';

type Tone = 'default' | 'danger' | 'brand';
type Size = 'sm' | 'md';

interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  icon: ReactNode;
  label: string;
  tone?: Tone;
  size?: Size;
}

const toneClasses: Record<Tone, string> = {
  default: 'text-slate-400 hover:bg-slate-100 hover:text-slate-600',
  danger: 'text-slate-400 hover:bg-red-50 hover:text-red-600',
  brand: 'text-slate-400 hover:bg-brand-50 hover:text-brand-600',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, tone = 'default', size = 'sm', className, type = 'button', disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        type={type}
        title={label}
        aria-label={label}
        whileTap={{ scale: disabled ? 1 : 0.92 }}
        className={clsx(
          'inline-flex shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          toneClasses[tone],
          sizeClasses[size],
          className
        )}
        disabled={disabled}
        {...props}
      >
        {icon}
      </motion.button>
    );
  }
);
IconButton.displayName = 'IconButton';

export default IconButton;
