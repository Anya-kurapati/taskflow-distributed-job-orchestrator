import { ChevronLeft, ChevronRight } from 'lucide-react';

import { PAGE_SIZES } from '@/constants/jobs';
import { cn } from '@/utils/cn';
import { formatCount } from '@/utils/format';
import { getPageItems } from '@/utils/pagination';

interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const pageButton =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-40';

export function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const first = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
      <div className="flex items-center gap-3">
        <p>
          Showing <span className="font-medium text-slate-900">{formatCount(first)}</span>–
          <span className="font-medium text-slate-900">{formatCount(last)}</span> of{' '}
          <span className="font-medium text-slate-900">{formatCount(totalItems)}</span>
        </p>
        <label className="flex items-center gap-1.5">
          <span className="sr-only sm:not-sr-only">Per page</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-md border border-slate-300 py-1 pr-7 pl-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className={cn(pageButton, 'hover:bg-slate-100')}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          {getPageItems(page, totalPages).map((item, index) =>
            item === 'gap' ? (
              <span key={`gap-${index}`} className="px-1 text-slate-400" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
                className={cn(
                  pageButton,
                  item === page
                    ? 'bg-indigo-600 font-medium text-white'
                    : 'text-slate-700 hover:bg-slate-100',
                )}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
            className={cn(pageButton, 'hover:bg-slate-100')}
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </nav>
      )}
    </div>
  );
}
