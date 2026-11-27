import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { Link } from 'react-router';

import type { Toast, ToastTone } from '@/context/toast-context';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';

const TONES: Record<ToastTone, { icon: typeof Info; iconClass: string; border: string }> = {
  success: { icon: CheckCircle2, iconClass: 'text-emerald-600', border: 'border-l-emerald-500' },
  error: { icon: XCircle, iconClass: 'text-red-600', border: 'border-l-red-500' },
  warning: { icon: AlertTriangle, iconClass: 'text-amber-500', border: 'border-l-amber-500' },
  info: { icon: Info, iconClass: 'text-indigo-600', border: 'border-l-indigo-500' },
};

/**
 * Renders notifications in the bottom-right corner. Lives inside the router so
 * toasts can link to the job they are about.
 */
export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <section
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </section>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const { icon: Icon, iconClass, border } = TONES[toast.tone];

  return (
    <div
      // Errors interrupt assistive tech; everything else is announced politely.
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex w-full gap-3 rounded-lg border border-l-4 border-slate-200 bg-white p-3 shadow-lg',
        border,
      )}
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', iconClass)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 line-clamp-2 text-sm break-words text-slate-600">
            {toast.description}
          </p>
        )}
        {toast.href && (
          <Link
            to={toast.href}
            onClick={onDismiss}
            className="mt-1 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            {toast.hrefLabel ?? 'View'}
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="-m-1 self-start rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
