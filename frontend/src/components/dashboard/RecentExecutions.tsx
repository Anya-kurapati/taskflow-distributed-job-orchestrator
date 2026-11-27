import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

import { QueryState } from '@/components/common/QueryState';
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { jobDetailsPath, ROUTES } from '@/constants/routes';
import { useRecentExecutions } from '@/hooks/useDashboard';
import { useJobProgress } from '@/hooks/useLiveUpdates';
import { useNow } from '@/hooks/useNow';
import type { Job } from '@/types/job';
import { formatDuration, formatRelativeTime } from '@/utils/format';

/** Latest jobs to start running, from `GET /dashboard/recent-executions`. */
export function RecentExecutions() {
  const { data: jobs = [], isPending, error, refetch } = useRecentExecutions();
  const now = useNow();

  return (
    <Card
      title="Recent executions"
      description="Latest jobs to start running"
      bodyClassName="py-2"
      actions={
        <Link
          to={ROUTES.JOBS}
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          View all
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      }
    >
      <QueryState
        isPending={isPending}
        error={error}
        isEmpty={jobs.length === 0}
        emptyMessage="No jobs have run yet."
        onRetry={() => void refetch()}
      >
        <ul aria-label="Recent executions" className="divide-y divide-slate-100">
          {jobs.map((job) => (
            <li key={job.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <div className="min-w-0 flex-1 basis-48">
                <Link
                  to={jobDetailsPath(job.id)}
                  className="block truncate text-sm font-medium text-indigo-700 hover:text-indigo-500 hover:underline"
                >
                  {job.name}
                </Link>
                <p className="truncate text-xs text-slate-500">{job.type}</p>
              </div>
              <div className="flex w-28 flex-col items-start gap-1.5">
                <JobStatusBadge status={job.status} />
                {job.status === 'RUNNING' && <RowProgress job={job} />}
              </div>
              <div className="w-32 text-right text-xs text-slate-500">
                <p title={job.startedAt ?? undefined}>
                  Started {formatRelativeTime(job.startedAt, now)}
                </p>
                <p className="tabular-nums">{describeRunTime(job, now)}</p>
              </div>
            </li>
          ))}
        </ul>
      </QueryState>
    </Card>
  );
}

function describeRunTime(job: Job, now: number): string {
  if (!job.startedAt) return '';
  const started = Date.parse(job.startedAt);
  if (job.completedAt) return `Took ${formatDuration(Date.parse(job.completedAt) - started)}`;
  if (job.status === 'RUNNING') return `Running for ${formatDuration(Math.max(0, now - started))}`;
  return '';
}

/** Compact live progress for a running job, when its task reports progress. */
function RowProgress({ job }: { job: Job }) {
  const progress = useJobProgress(job.id);
  if (!progress) return null;
  return (
    <div className="w-full" title={progress.message ?? undefined}>
      <ProgressBar percent={progress.percent} label={`${job.name} progress`} size="sm" />
    </div>
  );
}
