import { Ban, Pause, Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useJobAction } from '@/hooks/useJobs';
import type { Job, JobAction } from '@/types/job';
import { availableActions } from '@/utils/jobActions';

const ACTION_LABELS: Record<JobAction, { idle: string; busy: string }> = {
  retry: { idle: 'Retry job', busy: 'Retrying…' },
  pause: { idle: 'Pause', busy: 'Pausing…' },
  resume: { idle: 'Resume', busy: 'Resuming…' },
  cancel: { idle: 'Cancel job', busy: 'Cancelling…' },
};

const ACTION_ICONS = { retry: RotateCcw, pause: Pause, resume: Play, cancel: Ban };

/** Lifecycle actions valid for the job's current status. Cancelling asks for confirmation. */
export function JobActions({ job }: { job: Job }) {
  const action = useJobAction(job.id);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const actions = availableActions(job.status);
  const busy = action.isPending ? action.variables : undefined;

  if (actions.length === 0) return null;

  const run = (name: JobAction) => {
    setConfirmingCancel(false);
    action.mutate(name);
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {actions
          .filter((name) => name !== 'cancel')
          .map((name) => {
            const Icon = ACTION_ICONS[name];
            return (
              <Button
                key={name}
                variant={name === 'retry' ? 'primary' : 'secondary'}
                disabled={action.isPending}
                onClick={() => run(name)}
              >
                <Icon className="size-4" aria-hidden />
                {busy === name ? ACTION_LABELS[name].busy : ACTION_LABELS[name].idle}
              </Button>
            );
          })}
        {actions.includes('cancel') && !confirmingCancel && (
          <Button
            variant="secondary"
            disabled={action.isPending}
            onClick={() => setConfirmingCancel(true)}
            className="text-red-700"
          >
            <Ban className="size-4" aria-hidden />
            {busy === 'cancel' ? ACTION_LABELS.cancel.busy : ACTION_LABELS.cancel.idle}
          </Button>
        )}
      </div>

      {confirmingCancel && (
        <div
          role="alertdialog"
          aria-labelledby="cancel-confirm-title"
          className="flex flex-wrap items-center gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2"
        >
          <p id="cancel-confirm-title" className="text-sm text-red-800">
            {job.status === 'RUNNING'
              ? 'Cancel this job? The running attempt will be stopped.'
              : 'Cancel this job? It will not run.'}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setConfirmingCancel(false)} autoFocus>
              Keep job
            </Button>
            <Button variant="danger" onClick={() => run('cancel')}>
              Yes, cancel job
            </Button>
          </div>
        </div>
      )}

      {action.error && (
        <p role="alert" className="text-sm text-red-600">
          Could not {action.variables} job: {action.error.message}
        </p>
      )}
    </div>
  );
}
