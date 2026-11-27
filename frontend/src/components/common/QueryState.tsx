import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/Button';

interface QueryStateProps {
  isPending: boolean;
  error: Error | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
  children: ReactNode;
}

/** Renders loading / error / empty states for a query, otherwise its children. */
export function QueryState({
  isPending,
  error,
  isEmpty = false,
  emptyMessage = 'Nothing to show yet.',
  onRetry,
  children,
}: QueryStateProps) {
  if (isPending) {
    return (
      <div role="status" className="flex items-center justify-center gap-2 py-10 text-slate-500">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
        <AlertTriangle className="size-6 text-amber-500" aria-hidden />
        <p className="text-sm text-slate-700">{error.message}</p>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-slate-500">
        <Inbox className="size-6" aria-hidden />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
}
