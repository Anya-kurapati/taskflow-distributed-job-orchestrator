import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { PageHeader } from '@/components/common/PageHeader';
import { QueryState } from '@/components/common/QueryState';
import { ScheduleForm } from '@/components/schedules/ScheduleForm';
import { ScheduleStatusBadge } from '@/components/schedules/ScheduleStatusBadge';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { ROUTES } from '@/constants/routes';
import { useSaveSchedule, useSchedule } from '@/hooks/useSchedules';
import { ApiError } from '@/services/api';
import type { Schedule, ScheduleRequest } from '@/types/schedule';
import { scheduleFormDefaults, toScheduleFormValues } from '@/utils/scheduleRequest';

export function CreateSchedulePage() {
  const navigate = useNavigate();
  const save = useSaveSchedule();
  // Computed once so the default timezone etc. don't change while typing.
  const [defaults] = useState(scheduleFormDefaults);

  const handleSubmit = async (request: ScheduleRequest) => {
    await save.mutateAsync(request);
    await navigate(ROUTES.SCHEDULES);
  };

  return (
    <>
      <PageHeader
        title="New schedule"
        description="Each time the schedule fires, a new job is created from this definition."
      />
      <div className="max-w-4xl">
        <ScheduleForm
          defaultValues={defaults}
          submitLabel="Create schedule"
          onSubmit={handleSubmit}
          isSubmitting={save.isPending}
          submitError={save.error?.message}
        />
      </div>
    </>
  );
}

export function EditSchedulePage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: schedule, isPending, error, refetch } = useSchedule(id);

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Schedule not found</h1>
        <p className="mt-2 text-sm text-slate-500">It may have been deleted.</p>
        <ButtonLink to={ROUTES.SCHEDULES} variant="secondary" className="mt-6">
          <ArrowLeft className="size-4" aria-hidden />
          Back to schedules
        </ButtonLink>
      </div>
    );
  }

  return (
    <QueryState isPending={isPending} error={error} onRetry={() => void refetch()}>
      {/* Keyed by id so the form re-initialises if another schedule is opened. */}
      {schedule && <EditScheduleForm key={schedule.id} schedule={schedule} />}
    </QueryState>
  );
}

function EditScheduleForm({ schedule }: { schedule: Schedule }) {
  const navigate = useNavigate();
  const save = useSaveSchedule(schedule.id);
  // Snapshot: live updates to the schedule must not overwrite in-progress edits.
  const [defaults] = useState(() => toScheduleFormValues(schedule));

  const handleSubmit = async (request: ScheduleRequest) => {
    await save.mutateAsync(request);
    await navigate(ROUTES.SCHEDULES);
  };

  return (
    <>
      <PageHeader
        title={`Edit ${schedule.name}`}
        description="Changes apply to future runs; jobs already created are unaffected."
        actions={<ScheduleStatusBadge status={schedule.status} />}
      />
      <div className="max-w-4xl">
        <ScheduleForm
          defaultValues={defaults}
          submitLabel="Save changes"
          onSubmit={handleSubmit}
          isSubmitting={save.isPending}
          submitError={save.error?.message}
        />
      </div>
    </>
  );
}
