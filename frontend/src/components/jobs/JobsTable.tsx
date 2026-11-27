import { ArrowDown, ArrowUp } from 'lucide-react';
import { Link } from 'react-router';

import { jobDetailsPath } from '@/constants/routes';
import type { Job, JobSort } from '@/types/job';
import { formatDateTime } from '@/utils/format';

import { JobStatusBadge } from './JobStatusBadge';

interface JobsTableProps {
  jobs: Job[];
  sort: JobSort;
  onSortChange: (sort: JobSort) => void;
}

export function JobsTable({ jobs, sort, onSortChange }: JobsTableProps) {
  const descending = sort === 'createdAt:desc';
  const SortIcon = descending ? ArrowDown : ArrowUp;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <th scope="col" className="py-2 pr-4">
              Name
            </th>
            <th scope="col" className="py-2 pr-4">
              Type
            </th>
            <th scope="col" className="py-2 pr-4">
              Status
            </th>
            <th scope="col" className="py-2 pr-4 text-right">
              Attempts
            </th>
            <th scope="col" className="py-2" aria-sort={descending ? 'descending' : 'ascending'}>
              <button
                type="button"
                onClick={() => onSortChange(descending ? 'createdAt:asc' : 'createdAt:desc')}
                className="inline-flex items-center gap-1 uppercase hover:text-slate-800"
              >
                Created
                <SortIcon className="size-3.5" aria-hidden />
                <span className="sr-only">
                  , sorted {descending ? 'newest first' : 'oldest first'}. Click to reverse.
                </span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jobs.map((job) => (
            <tr key={job.id} className="hover:bg-slate-50">
              <td className="max-w-xs py-2.5 pr-4">
                <Link
                  to={jobDetailsPath(job.id)}
                  className="block truncate font-medium text-indigo-700 hover:text-indigo-500 hover:underline"
                >
                  {job.name}
                </Link>
                {job.description && (
                  <p className="truncate text-xs text-slate-500">{job.description}</p>
                )}
              </td>
              <td className="py-2.5 pr-4 font-mono text-xs whitespace-nowrap text-slate-600">
                {job.type}
              </td>
              <td className="py-2.5 pr-4">
                <JobStatusBadge status={job.status} />
              </td>
              <td className="py-2.5 pr-4 text-right text-slate-600 tabular-nums">
                {job.attempts}/{job.maxRetries + 1}
              </td>
              <td className="py-2.5 whitespace-nowrap text-slate-600">
                {formatDateTime(job.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
