import { Pause, Pencil, Play, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/button-styles';
import { jobDetailsPath, scheduleEditPath } from '@/constants/routes';
import { useDeleteSchedule, useScheduleAction } from '@/hooks/useSchedules';
import { useNow } from '@/hooks/useNow';
import type { Schedule } from '@/types/schedule';
import { formatDateTime, formatRelativeTime } from '@/utils/format';
import { describeTrigger } from '@/utils/scheduleRequest';

import { ScheduleStatusBadge } from './ScheduleStatusBadge';

const iconButton = 'px-2 py-1.5';

export function SchedulesTable({ schedules }: { schedules: Schedule[] }) {
  const now = useNow();
  const action = useScheduleAction();
  const remove = useDeleteSchedule();
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const error = action.error ?? remove.error;

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <th scope="col" className="py-2 pr-4">
                Name
              </th>
              <th scope="col" className="py-2 pr-4">
                When
              </th>
              <th scope="col" className="py-2 pr-4">
                Status
              </th>
              <th scope="col" className="py-2 pr-4">
                Next run
              </th>
              <th scope="col" className="py-2 pr-4">
                Last run
              </th>
              <th scope="col" className="py-2 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 align-top">
            {schedules.map((schedule) => {
              const busy =
                (action.isPending && action.variables?.id === schedule.id) ||
                (remove.isPending && remove.variables === schedule.id);
              return (
                <tr key={schedule.id}>
                  <td className="max-w-56 py-3 pr-4">
                    <p className="truncate font-medium text-slate-900">{schedule.name}</p>
                    {schedule.description && (
                      <p className="truncate text-xs text-slate-500">{schedule.description}</p>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-slate-700">{describeTrigger(schedule.trigger)}</p>
                    {schedule.trigger.type === 'CRON' && (
                      <p className="text-xs text-slate-500">
                        <code className="font-mono">{schedule.trigger.expression}</code> ·{' '}
                        {schedule.trigger.timezone}
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <ScheduleStatusBadge status={schedule.status} />
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap text-slate-700">
                    {schedule.nextRunAt ? (
                      <>
                        {formatDateTime(schedule.nextRunAt)}
                        <span className="block text-xs text-slate-500">
                          {formatRelativeTime(schedule.nextRunAt, now)}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap text-slate-700">
                    <LastRun schedule={schedule} now={now} />
                  </td>
                  <td className="py-3">
                    {confirmingDelete === schedule.id ? (
                      <div
                        role="alertdialog"
                        aria-label={`Delete ${schedule.name}?`}
                        className="flex flex-wrap items-center justify-end gap-2"
                      >
                        <span className="text-xs text-slate-600">Delete schedule?</span>
                        <Button
                          variant="secondary"
                          className={iconButton}
                          onClick={() => setConfirmingDelete(null)}
                          autoFocus
                        >
                          Keep
                        </Button>
                        <Button
                          variant="danger"
                          className={iconButton}
                          onClick={() => {
                            setConfirmingDelete(null);
                            remove.mutate(schedule.id);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        {schedule.status === 'ACTIVE' && (
                          <Button
                            variant="ghost"
                            className={iconButton}
                            disabled={busy}
                            aria-label={`Pause ${schedule.name}`}
                            title="Pause"
                            onClick={() => action.mutate({ id: schedule.id, action: 'pause' })}
                          >
                            <Pause className="size-4" aria-hidden />
                          </Button>
                        )}
                        {schedule.status === 'PAUSED' && (
                          <Button
                            variant="ghost"
                            className={iconButton}
                            disabled={busy}
                            aria-label={`Resume ${schedule.name}`}
                            title="Resume"
                            onClick={() => action.mutate({ id: schedule.id, action: 'resume' })}
                          >
                            <Play className="size-4" aria-hidden />
                          </Button>
                        )}
                        <Link
                          to={scheduleEditPath(schedule.id)}
                          aria-label={`Edit ${schedule.name}`}
                          title="Edit"
                          className={buttonClasses('ghost', iconButton)}
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Link>
                        <Button
                          variant="ghost"
                          className={`${iconButton} hover:text-red-700`}
                          disabled={busy}
                          aria-label={`Delete ${schedule.name}`}
                          title="Delete"
                          onClick={() => setConfirmingDelete(schedule.id)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LastRun({ schedule, now }: { schedule: Schedule; now: number }) {
  if (!schedule.lastRunAt) return <span className="text-slate-400">Never</span>;
  const when = formatRelativeTime(schedule.lastRunAt, now);
  if (schedule.lastRunOutcome === 'SKIPPED') {
    return (
      <>
        {when}
        <span className="block text-xs text-amber-700">Skipped — previous job still active</span>
      </>
    );
  }
  return (
    <>
      {when}
      {schedule.lastJobId && (
        <Link
          to={jobDetailsPath(schedule.lastJobId)}
          className="block text-xs text-indigo-700 hover:text-indigo-500 hover:underline"
        >
          View job
        </Link>
      )}
    </>
  );
}
