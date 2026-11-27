import { Boxes, Webhook } from 'lucide-react';
import { Link } from 'react-router';

import { Card } from '@/components/ui/Card';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { scheduleEditPath } from '@/constants/routes';
import type { HttpTarget, Job } from '@/types/job';
import { formatDateTime, formatDuration, toTitleCase } from '@/utils/format';
import { maskHeaderValue } from '@/utils/headers';

import { Detail } from './JobOverview';

/** What the job runs and how it is retried. */
export function JobConfiguration({ job }: { job: Job }) {
  const { target } = job;

  return (
    <Card title="Configuration">
      <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="Runs">
          <span className="inline-flex items-center gap-1.5">
            {target.kind === 'TASK' ? (
              <>
                <Boxes className="size-4 text-slate-400" aria-hidden />
                Registered task <code className="font-mono text-xs">{target.taskType}</code>
              </>
            ) : (
              <>
                <Webhook className="size-4 text-slate-400" aria-hidden />
                HTTP webhook
              </>
            )}
          </span>
        </Detail>
        <Detail label="Priority">{toTitleCase(job.priority)}</Detail>
        <Detail label="Timeout">{formatDuration(job.timeoutSeconds * 1000)} per attempt</Detail>
        <Detail label="Retry count">
          {job.maxRetries === 0 ? 'No retries' : `${job.maxRetries}`}
        </Detail>
        <Detail label="Retry delay">{formatDuration(job.retryDelaySeconds * 1000)}</Detail>
        <Detail label="Scheduled for">
          {job.scheduledAt ? formatDateTime(job.scheduledAt) : 'Run on creation'}
        </Detail>
        <Detail label="Created">{formatDateTime(job.createdAt)}</Detail>
        {job.scheduleId && (
          <Detail label="Schedule">
            <Link
              to={scheduleEditPath(job.scheduleId)}
              className="text-indigo-700 hover:text-indigo-500 hover:underline"
            >
              Created by a schedule
            </Link>
          </Detail>
        )}
        <Detail label="Job ID">
          <code className="font-mono text-xs break-all">{job.id}</code>
        </Detail>
      </dl>

      <div className="mt-6 border-t border-slate-100 pt-5">
        {target.kind === 'TASK' ? (
          <>
            <h3 className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">
              Payload
            </h3>
            <CodeBlock value={target.payload} />
          </>
        ) : (
          <HttpTargetDetails target={target} />
        )}
      </div>
    </Card>
  );
}

function HttpTargetDetails({ target }: { target: HttpTarget }) {
  const headers = Object.entries(target.headers);

  return (
    <div className="space-y-4">
      <p className="flex min-w-0 items-center gap-2 text-sm">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700">
          {target.method}
        </span>
        <code className="font-mono text-xs break-all text-slate-900">{target.url}</code>
      </p>

      <div>
        <h3 className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Headers</h3>
        {headers.length === 0 ? (
          <p className="text-sm text-slate-500">None</p>
        ) : (
          <table className="text-sm">
            <tbody>
              {headers.map(([name, value]) => (
                <tr key={name}>
                  <th
                    scope="row"
                    className="py-0.5 pr-4 text-left font-mono text-xs font-normal text-slate-500"
                  >
                    {name}
                  </th>
                  <td className="py-0.5 font-mono text-xs break-all text-slate-900">
                    {maskHeaderValue(name, value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {target.body !== undefined && (
        <div>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Body</h3>
          <CodeBlock value={target.body} />
        </div>
      )}
    </div>
  );
}
