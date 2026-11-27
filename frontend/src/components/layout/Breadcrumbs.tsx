import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';

import type { Crumb } from '@/hooks/useBreadcrumbs';
import { cn } from '@/utils/cn';

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
      <ol className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li
              key={crumb.pathname}
              // On small screens only the current page is shown.
              className={cn('min-w-0 items-center gap-1.5', isLast ? 'flex' : 'hidden sm:flex')}
            >
              {index > 0 && (
                <ChevronRight
                  className="hidden size-4 shrink-0 text-slate-400 sm:block"
                  aria-hidden
                />
              )}
              {isLast ? (
                <span aria-current="page" className="truncate font-medium text-slate-900">
                  {crumb.label}
                </span>
              ) : (
                <Link to={crumb.pathname} className="truncate text-slate-500 hover:text-slate-800">
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
