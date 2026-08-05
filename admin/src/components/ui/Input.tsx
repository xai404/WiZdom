import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
  rightSlot?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, error, rightSlot, className, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full rounded-xl border bg-white py-2.5 text-sm text-slate-800 outline-none transition',
              'focus:border-brand-500 focus:ring-2 focus:ring-brand-100',
              icon ? 'pl-9' : 'pl-3.5',
              rightSlot ? 'pr-10' : 'pr-3.5',
              error ? 'border-red-300' : 'border-slate-200',
              className
            )}
            {...props}
          />
          {rightSlot && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</span>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export default Input;
