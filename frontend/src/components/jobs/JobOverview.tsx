import type { ReactNode } from 'react';

import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useJobProgress } from '@/hooks/useLiveUpdates';
import { useNow } from '@/hooks/useNow';
import type { Job } from '@/types/job';
import { formatDateTime, formatDuration, formatRelativeTime } from '@/utils/format';

import { JobStatusBadge } from './JobStatusBadge';

/** Current status, attempts and timing. */
export function JobOverview({ job }: { job: Job }) {
  const now = useNow(1_000);
  const totalAttempts = job.maxRetries + 1;
  const progress = useJobProgress(job.id);

  return (
    <Card title="Status">
      <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="Current status">
          <JobStatusBadge status={job.status} />
        </Detail>
        <Detail label="Attempts">
          {job.attempts} of {totalAttempts}
          {job.attempts > totalAttempts && (
            <span className="ml-1 text-slate-500">(includes manual retries)</span>
          )}
        </Detail>
        <Detail label="Next scheduled execution">
          <NextRun job={job} now={now} />
        </Detail>
        <Detail label="Started">
          {formatDateTime(job.startedAt)}
          {job.startedAt && <Relative value={job.startedAt} now={now} />}
        </Detail>
        <Detail label="Finished">
          {formatDateTime(job.completedAt)}
          {job.completedAt && <Relative value={job.completedAt} now={now} />}
        </Detail>
        <Detail label={job.status === 'RUNNING' ? 'Running for' : 'Duration'}>
          {describeDuration(job, now)}
        </Detail>
      </dl>
      {job.status === 'RUNNING' && progress && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="mb-1.5 text-xs font-medium tracking-wide text-slate-500 uppercase">
            Progress
          </p>
          <ProgressBar
            percent={progress.percent}
            message={progress.message}
            label={`Progress of attempt ${job.attempts}`}
          />
        </div>
      )}
    </Card>
  );
}

function NextRun({ job, now }: { job: Job; now: number }) {
  if (job.status === 'PAUSED') return <>Paused</>;
  if (job.status !== 'SCHEDULED' || !job.nextRunAt) {
    return <span className="text-slate-500">Not scheduled</span>;
  }
  return (
    <>
      {formatDateTime(job.nextRunAt)}
      <Relative value={job.nextRunAt} now={now} />
      {job.attempts > 0 && <span className="block text-xs text-slate-500">Automatic retry</span>}
    </>
  );
}

function Relative({ value, now }: { value: string; now: number }) {
  return <span className="block text-xs text-slate-500">{formatRelativeTime(value, now)}</span>;
}

function describeDuration(job: Job, now: number): string {
  if (!job.startedAt) return '—';
  const started = Date.parse(job.startedAt);
  if (job.status === 'RUNNING') return formatDuration(Math.max(0, now - started));
  if (job.completedAt) return formatDuration(Date.parse(job.completedAt) - started);
  return '—';
}

export function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{children}</dd>
    </div>
  );
}
