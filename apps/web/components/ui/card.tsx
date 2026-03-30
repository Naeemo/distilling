// Card 组件

import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  isHoverable?: boolean;
}

export function Card({ children, className, isHoverable, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'card dark:border-gray-800 dark:bg-gray-900/92',
        isHoverable && 'cursor-pointer hover:shadow-[0_18px_50px_rgba(15,23,42,0.10)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-5 py-4 border-b border-gray-100 dark:border-gray-800', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('font-semibold text-lg', className)}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-gray-500 dark:text-gray-400', className)}>
      {children}
    </p>
  );
}

export function CardContent({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5', className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return <CardContent className={className}>{children}</CardContent>;
}

export function CardFooter({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-5 py-4 border-t border-gray-100 dark:border-gray-800', className)}>
      {children}
    </div>
  );
}
