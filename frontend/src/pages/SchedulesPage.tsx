import { Plus } from 'lucide-react';

import { PageHeader } from '@/components/common/PageHeader';
import { QueryState } from '@/components/common/QueryState';
import { SchedulesTable } from '@/components/schedules/SchedulesTable';
import { UpcomingExecutions } from '@/components/schedules/UpcomingExecutions';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Card } from '@/components/ui/Card';
import { ROUTES } from '@/constants/routes';
import { useSchedules } from '@/hooks/useSchedules';

export function SchedulesPage() {
  const { data: schedules = [], isPending, error, refetch } = useSchedules();

  return (
    <>
      <PageHeader
        title="Scheduled jobs"
        description="Run jobs once at a set time or repeatedly on a cron schedule."
        actions={
          <ButtonLink to={ROUTES.SCHEDULE_CREATE}>
            <Plus className="size-4" aria-hidden />
            New schedule
          </ButtonLink>
        }
      />

      <div className="grid gap-6 2xl:grid-cols-3">
        <Card title="Schedules" className="2xl:col-span-2">
          <QueryState
            isPending={isPending}
            error={error}
            isEmpty={schedules.length === 0}
            emptyMessage="No schedules yet. Create one to run jobs automatically."
            onRetry={() => void refetch()}
          >
            <SchedulesTable schedules={schedules} />
          </QueryState>
        </Card>
        <UpcomingExecutions />
      </div>
    </>
  );
}
