import type { ExecutionStatus, JobStatus } from '@/types/job';
import { cn } from '@/utils/cn';
import { toTitleCase } from '@/utils/format';

const statusClasses: Record<JobStatus | ExecutionStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-700',
  SCHEDULED: 'bg-violet-100 text-violet-800',
  QUEUED: 'bg-sky-100 text-sky-800',
  RUNNING: 'bg-indigo-100 text-indigo-800',
  PAUSED: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  SUCCEEDED: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-red-100 text-red-800',
  TIMED_OUT: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-slate-200 text-slate-700',
};

/** Status pill for a job or an individual execution attempt (text label, never color alone). */
export function JobStatusBadge({ status }: { status: JobStatus | ExecutionStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        statusClasses[status],
      )}
    >
      {status === 'RUNNING' && (
        <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />
      )}
      {toTitleCase(status.replace('_', ' '))}
    </span>
  );
}
