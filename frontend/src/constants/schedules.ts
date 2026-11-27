export const SCHEDULE_STATUSES = ['ACTIVE', 'PAUSED', 'COMPLETED'] as const;

export const TRIGGER_TYPES = ['ONCE', 'CRON'] as const;

/**
 * What happens when a recurring schedule fires while the job it created last
 * time is still waiting or running: SKIP this run, or ALLOW overlapping jobs.
 */
export const OVERLAP_POLICIES = ['SKIP', 'ALLOW'] as const;

export const UPCOMING_EXECUTIONS_LIMIT = 10;
export const CRON_PREVIEW_COUNT = 5;

export const CRON_PRESETS = [
  { label: 'Every 15 minutes', expression: '*/15 * * * *' },
  { label: 'Every hour', expression: '0 * * * *' },
  { label: 'Every day at 09:00', expression: '0 9 * * *' },
  { label: 'Weekdays at 09:00', expression: '0 9 * * 1-5' },
  { label: 'Every Monday at 08:00', expression: '0 8 * * 1' },
  { label: 'First day of every month at 00:00', expression: '0 0 1 * *' },
] as const;
