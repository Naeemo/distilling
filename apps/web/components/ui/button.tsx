// Button 组件

import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        // 基础样式
        'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        
        // 变体样式
        variant === 'primary' && 'bg-primary-500 text-white shadow-[0_10px_24px_rgba(47,86,211,0.22)] hover:-translate-y-0.5 hover:bg-primary-600 focus:ring-primary-300',
        variant === 'secondary' && 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-300 dark:bg-gray-800 dark:text-gray-100',
        variant === 'ghost' && 'text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800',
        variant === 'outline' && 'border border-gray-200 bg-white/80 text-gray-700 hover:bg-white focus:ring-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        
        // 尺寸样式
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2.5 text-sm',
        size === 'lg' && 'px-6 py-3.5 text-base',
        size === 'icon' && 'h-10 w-10',
        
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
