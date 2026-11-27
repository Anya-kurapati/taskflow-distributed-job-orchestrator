import type { JobAction, JobStatus } from '@/types/job';

/**
 * Which lifecycle actions apply in each status. Shared by the UI (to show
 * buttons) and the mock API (to accept/reject requests) so they can't drift.
 */
const WAITING: readonly JobStatus[] = ['PENDING', 'SCHEDULED', 'QUEUED'];

/** Waiting or running — the job may still change on its own, so poll it. */
export const isJobActive = (status: JobStatus) => WAITING.includes(status) || status === 'RUNNING';

export const canPause = (status: JobStatus) => WAITING.includes(status);
export const canResume = (status: JobStatus) => status === 'PAUSED';
export const canCancel = (status: JobStatus) =>
  WAITING.includes(status) || status === 'RUNNING' || status === 'PAUSED';
export const canRetry = (status: JobStatus) => status === 'FAILED';

const RULES: Record<JobAction, (status: JobStatus) => boolean> = {
  retry: canRetry,
  pause: canPause,
  resume: canResume,
  cancel: canCancel,
};

export const isActionAllowed = (action: JobAction, status: JobStatus) => RULES[action](status);

export const availableActions = (status: JobStatus): JobAction[] =>
  (Object.keys(RULES) as JobAction[]).filter((action) => RULES[action](status));
