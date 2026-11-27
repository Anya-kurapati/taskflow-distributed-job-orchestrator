import { ListChecks, Plus } from 'lucide-react';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PageHeader } from '@/components/common/PageHeader';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { JobTrendsCard } from '@/components/dashboard/JobTrendsCard';
import { RecentExecutions } from '@/components/dashboard/RecentExecutions';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { env } from '@/config/env';
import { ROUTES } from '@/constants/routes';
import { formatDuration } from '@/utils/format';

/**
 * Every number on this page comes from the backend's dashboard endpoints
 * (`/dashboard/summary`, `/dashboard/trends`, `/dashboard/recent-executions`).
 * Each section loads and fails independently — including render errors.
 */
export function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Live overview of job execution · refreshes every ${formatDuration(env.pollIntervalMs)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink to={ROUTES.JOBS} variant="secondary">
              <ListChecks className="size-4" aria-hidden />
              View all jobs
            </ButtonLink>
            <ButtonLink to={ROUTES.JOB_CREATE}>
              <Plus className="size-4" aria-hidden />
              Create job
            </ButtonLink>
          </div>
        }
      />

      <section aria-label="Job metrics">
        <ErrorBoundary label="job metrics">
          <DashboardStats />
        </ErrorBoundary>
      </section>

      <div className="mt-6 space-y-6">
        <ErrorBoundary label="execution trends">
          <JobTrendsCard />
        </ErrorBoundary>
        <ErrorBoundary label="recent executions">
          <RecentExecutions />
        </ErrorBoundary>
      </div>
    </>
  );
}
