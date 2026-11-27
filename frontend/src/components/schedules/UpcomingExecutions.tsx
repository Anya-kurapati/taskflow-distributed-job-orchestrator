import { QueryState } from '@/components/common/QueryState';
import { Card } from '@/components/ui/Card';
import { useNow } from '@/hooks/useNow';
import { useUpcomingExecutions } from '@/hooks/useSchedules';
import { formatDateTime, formatRelativeTime } from '@/utils/format';

/** The next runs across all active schedules, from `GET /schedules/upcoming`. */
export function UpcomingExecutions() {
  const { data: runs = [], isPending, error, refetch } = useUpcomingExecutions();
  const now = useNow();

  return (
    <Card title="Upcoming executions" description="Next runs across active schedules">
      <QueryState
        isPending={isPending}
        error={error}
        isEmpty={runs.length === 0}
        emptyMessage="No active schedules."
        onRetry={() => void refetch()}
      >
        <ol aria-label="Upcoming executions" className="divide-y divide-slate-100">
          {runs.map((run) => (
            <li key={`${run.scheduleId}-${run.runAt}`} className="flex items-baseline gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{run.scheduleName}</p>
                <p className="text-xs text-slate-500">{formatDateTime(run.runAt)}</p>
              </div>
              <span className="text-xs whitespace-nowrap text-slate-600 tabular-nums">
                {formatRelativeTime(run.runAt, now)}
              </span>
            </li>
          ))}
        </ol>
      </QueryState>
    </Card>
  );
}
