import { CheckCircle2, Clock, Layers, Loader, XCircle } from 'lucide-react';

import { QueryState } from '@/components/common/QueryState';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { formatPercent } from '@/utils/format';

import { StatCard } from './StatCard';

/** Headline job counts, all computed by the backend (`GET /dashboard/summary`). */
export function DashboardStats() {
  const { data: summary, isPending, error, refetch } = useDashboardSummary();

  if (error && !summary) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <QueryState isPending={false} error={error} onRetry={() => void refetch()}>
          {null}
        </QueryState>
      </div>
    );
  }

  const finished = summary ? summary.successfulJobs + summary.failedJobs : 0;
  const successRate =
    summary && finished > 0
      ? `${formatPercent(summary.successfulJobs / finished)} success rate`
      : undefined;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      <StatCard
        label="Total jobs"
        value={summary?.totalJobs}
        icon={Layers}
        hint="All time"
        isLoading={isPending}
      />
      <StatCard
        label="Successful"
        value={summary?.successfulJobs}
        icon={CheckCircle2}
        hint={successRate}
        isLoading={isPending}
      />
      <StatCard
        label="Failed"
        value={summary?.failedJobs}
        icon={XCircle}
        tone={summary && summary.failedJobs > 0 ? 'critical' : 'neutral'}
        hint="Finished with an error"
        isLoading={isPending}
      />
      <StatCard
        label="Running"
        value={summary?.runningJobs}
        icon={Loader}
        hint="Executing now"
        isLoading={isPending}
      />
      <StatCard
        label="Pending"
        value={summary?.pendingJobs}
        icon={Clock}
        hint="Waiting, queued or scheduled"
        isLoading={isPending}
      />
    </div>
  );
}
