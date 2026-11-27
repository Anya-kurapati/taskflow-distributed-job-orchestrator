import { XCircle } from 'lucide-react';

import { CodeBlock } from '@/components/ui/CodeBlock';
import type { JobError } from '@/types/job';

interface JobErrorPanelProps {
  error: JobError;
  title: string;
}

/** Error details for a failed job or a pending retry. */
export function JobErrorPanel({ error, title }: JobErrorPanelProps) {
  return (
    <section
      aria-labelledby="job-error-title"
      className="rounded-lg border border-red-200 bg-red-50 p-4"
    >
      <div className="flex gap-3">
        <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="job-error-title" className="text-sm font-semibold text-red-900">
            {title}
          </h2>
          <p className="mt-1 text-sm break-words text-red-800">{error.message}</p>
          {error.code && (
            <p className="mt-1 text-xs text-red-700">
              Error code: <code className="font-mono">{error.code}</code>
            </p>
          )}
          {error.details && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-red-800">
                Show details
              </summary>
              <CodeBlock value={error.details} className="mt-2" />
            </details>
          )}
        </div>
      </div>
    </section>
  );
}
