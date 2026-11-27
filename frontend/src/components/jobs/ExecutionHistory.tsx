import { QueryState } from '@/components/common/QueryState';
import { Card } from '@/components/ui/Card';
import { useJobExecutions } from '@/hooks/useJobs';
import type { Job } from '@/types/job';
import { formatDateTime, formatDuration } from '@/utils/format';
import { isJobActive } from '@/utils/jobActions';

import { JobStatusBadge } from './JobStatusBadge';

/** Every execution attempt, newest first, from `GET /jobs/:id/executions`. */
export function ExecutionHistory({ job }: { job: Job }) {
  const {
    data: executions = [],
    isPending,
    error,
    refetch,
  } = useJobExecutions(job.id, {
    live: isJobActive(job.status),
  });

  return (
    <Card
      title="Execution history"
      description={`${job.attempts} ${job.attempts === 1 ? 'attempt' : 'attempts'}`}
    >
      <QueryState
        isPending={isPending}
        error={error}
        isEmpty={executions.length === 0}
        emptyMessage="This job hasn't run yet."
        onRetry={() => void refetch()}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <caption className="sr-only">Execution attempts, newest first</caption>
            <thead>
              <tr className="text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <th scope="col" className="py-2 pr-4">
                  Attempt
                </th>
                <th scope="col" className="py-2 pr-4">
                  Status
                </th>
                <th scope="col" className="py-2 pr-4">
                  Started
                </th>
                <th scope="col" className="py-2 pr-4">
                  Finished
                </th>
                <th scope="col" className="py-2 pr-4 text-right">
                  Duration
                </th>
                <th scope="col" className="py-2 pr-4">
                  Worker
                </th>
                <th scope="col" className="py-2">
                  Error
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {executions.map((execution) => (
                <tr key={execution.id}>
                  <td className="py-2.5 pr-4 font-medium text-slate-900 tabular-nums">
                    #{execution.attempt}
                  </td>
                  <td className="py-2.5 pr-4">
                    <JobStatusBadge status={execution.status} />
                  </td>
                  <td className="py-2.5 pr-4 whitespace-nowrap text-slate-600">
                    {formatDateTime(execution.startedAt)}
                  </td>
                  <td className="py-2.5 pr-4 whitespace-nowrap text-slate-600">
                    {formatDateTime(execution.finishedAt)}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-slate-600 tabular-nums">
                    {execution.durationMs != null ? formatDuration(execution.durationMs) : '—'}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-slate-600">
                    {execution.workerId ?? '—'}
                  </td>
                  <td className="min-w-48 py-2.5 text-xs text-red-700">
                    {execution.error ? (
                      <>
                        {execution.error.message}
                        {execution.error.code && (
                          <code className="ml-1 font-mono text-red-500">
                            ({execution.error.code})
                          </code>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </Card>
  );
}
