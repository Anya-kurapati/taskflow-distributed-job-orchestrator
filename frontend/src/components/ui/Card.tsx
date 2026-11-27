import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

interface CardProps {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

export function Card({
  title,
  description,
  actions,
  className,
  bodyClassName,
  children,
}: CardProps) {
  return (
    <section className={cn('rounded-lg border border-slate-200 bg-white shadow-sm', className)}>
      {(title ?? actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}
