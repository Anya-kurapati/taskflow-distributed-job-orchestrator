import { ArrowLeft } from 'lucide-react';
import { useParams } from 'react-router';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { QueryState } from '@/components/common/QueryState';
import { ExecutionHistory } from '@/components/jobs/ExecutionHistory';
import { JobActions } from '@/components/jobs/JobActions';
import { JobConfiguration } from '@/components/jobs/JobConfiguration';
import { JobErrorPanel } from '@/components/jobs/JobErrorPanel';
import { JobOverview } from '@/components/jobs/JobOverview';
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { ROUTES } from '@/constants/routes';
import { useJob } from '@/hooks/useJobs';
import { ApiError } from '@/services/api';
import type { Job } from '@/types/job';

export function JobDetailsPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: job, isPending, error, refetch } = useJob(id);

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Job not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          No job exists with ID <code className="font-mono">{id}</code>.
        </p>
        <ButtonLink to={ROUTES.JOBS} variant="secondary" className="mt-6">
          <ArrowLeft className="size-4" aria-hidden />
          Back to jobs
        </ButtonLink>
      </div>
    );
  }

  return (
    <QueryState isPending={isPending} error={error} onRetry={() => void refetch()}>
      {job && <JobDetails job={job} />}
    </QueryState>
  );
}

function JobDetails({ job }: { job: Job }) {
  // Show the last error while the job is failed, or while a retry is pending.
  const errorTitle =
    job.status === 'FAILED'
      ? 'Job failed'
      : job.status === 'SCHEDULED' && job.attempts > 0
        ? 'Last attempt failed — retry scheduled'
        : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold break-words text-slate-900">{job.name}</h1>
            <JobStatusBadge status={job.status} />
          </div>
          {job.description && <p className="mt-1 text-sm text-slate-600">{job.description}</p>}
          <p className="mt-1 font-mono text-xs text-slate-500">{job.type}</p>
        </div>
        <JobActions job={job} />
      </header>

      {errorTitle && job.lastError && <JobErrorPanel error={job.lastError} title={errorTitle} />}

      <ErrorBoundary label="job status" resetKeys={[job.id]}>
        <JobOverview job={job} />
      </ErrorBoundary>
      <ErrorBoundary label="execution history" resetKeys={[job.id]}>
        <ExecutionHistory job={job} />
      </ErrorBoundary>
      <ErrorBoundary label="job configuration" resetKeys={[job.id]}>
        <JobConfiguration job={job} />
      </ErrorBoundary>
    </div>
  );
}
