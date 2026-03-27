import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline';
  size?: 'sm' | 'md';
}

export function Badge({
  children,
  className,
  variant = 'default',
  size = 'md',
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        variant === 'default' && 'bg-primary-100 text-primary-700',
        variant === 'secondary' && 'bg-gray-100 text-gray-700',
        variant === 'outline' && 'border border-gray-200 text-gray-700',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
