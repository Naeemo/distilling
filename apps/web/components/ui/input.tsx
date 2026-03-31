// Input 组件

import { useId } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  const fallbackId = useId();
  const inputId = props.id ?? fallbackId;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full rounded-xl border bg-white/90 px-3 py-2.5 shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          'transition-all duration-200',
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-500/40 dark:bg-[#101c2f] dark:text-white'
            : 'border-gray-200 focus:border-primary-400 focus:ring-primary-100 dark:border-white/10 dark:bg-[#101c2f] dark:text-white dark:placeholder:text-gray-500',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
      )}
    </div>
  );
}
