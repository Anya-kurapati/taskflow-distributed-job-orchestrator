import { Plus } from 'lucide-react';
import { useSearchParams } from 'react-router';

import { PageHeader } from '@/components/common/PageHeader';
import { QueryState } from '@/components/common/QueryState';
import { JobFilters } from '@/components/jobs/JobFilters';
import { JobsTable } from '@/components/jobs/JobsTable';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Card } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { ROUTES } from '@/constants/routes';
import { useJobs } from '@/hooks/useJobs';
import { cn } from '@/utils/cn';
import {
  DEFAULT_JOB_LIST_QUERY,
  hasActiveFilters,
  parseJobListQuery,
  toJobListParams,
  toSearchParams,
  type JobListQuery,
} from '@/utils/jobListQuery';

export function JobsPage() {
  // Search, filters, sort and page all live in the URL (bookmarkable, back-button friendly).
  const [searchParams, setSearchParams] = useSearchParams();
  const query = parseJobListQuery(searchParams);
  const { data, isPending, error, refetch, isPlaceholderData } = useJobs(toJobListParams(query));

  const update = (changes: Partial<JobListQuery>) => {
    // Any change other than paging starts again from page 1.
    const page = changes.page ?? 1;
    setSearchParams(toSearchParams({ ...query, ...changes, page }));
  };
  const clearFilters = () =>
    setSearchParams(toSearchParams({ ...DEFAULT_JOB_LIST_QUERY, pageSize: query.pageSize }));

  const jobs = data?.items ?? [];
  const filtered = hasActiveFilters(query);

  return (
    <>
      <PageHeader
        title="Jobs"
        description="All jobs submitted to the orchestrator."
        actions={
          <ButtonLink to={ROUTES.JOB_CREATE}>
            <Plus className="size-4" aria-hidden />
            Create job
          </ButtonLink>
        }
      />

      <Card bodyClassName="space-y-4">
        <JobFilters query={query} onChange={update} onClear={clearFilters} />

        <div
          aria-busy={isPlaceholderData}
          className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}
        >
          <QueryState
            isPending={isPending}
            error={error}
            isEmpty={jobs.length === 0}
            emptyMessage={
              filtered ? 'No jobs match your filters.' : 'No jobs have been created yet.'
            }
            onRetry={() => void refetch()}
          >
            <JobsTable jobs={jobs} sort={query.sort} onSortChange={(sort) => update({ sort })} />
          </QueryState>
        </div>

        {data && data.totalItems > 0 && (
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            totalItems={data.totalItems}
            totalPages={data.totalPages}
            onPageChange={(page) => update({ page })}
            onPageSizeChange={(pageSize) => update({ pageSize })}
          />
        )}
      </Card>
    </>
  );
}
