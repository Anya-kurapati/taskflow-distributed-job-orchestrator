import type { ScheduleStatus } from '@/types/schedule';
import { cn } from '@/utils/cn';
import { toTitleCase } from '@/utils/format';

const statusClasses: Record<ScheduleStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  PAUSED: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-slate-200 text-slate-700',
};

export function ScheduleStatusBadge({ status }: { status: ScheduleStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        statusClasses[status],
      )}
    >
      {toTitleCase(status)}
    </span>
  );
}
