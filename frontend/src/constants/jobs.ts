export const JOB_STATUSES = [
  'PENDING',
  'SCHEDULED',
  'QUEUED',
  'RUNNING',
  'PAUSED',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
] as const;

/** Outcome of a single execution attempt. */
export const EXECUTION_STATUSES = [
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'TIMED_OUT',
  'CANCELLED',
] as const;

export const JOB_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

/**
 * What a job runs. v1 supports registered task types and HTTP webhooks only —
 * never arbitrary shell commands or code.
 */
export const JOB_KINDS = ['TASK', 'HTTP'] as const;

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

/** `job.type` for HTTP webhook jobs (task jobs use their registered task type). */
export const HTTP_WEBHOOK_TYPE = 'http.webhook';

export const JOB_LIMITS = {
  nameMin: 3,
  nameMax: 100,
  descriptionMax: 500,
  timeoutSecondsMin: 1,
  timeoutSecondsMax: 86_400,
  maxRetriesMax: 10,
  retryDelaySecondsMax: 3_600,
  /** Serialized payload/body size limit in bytes. */
  payloadMaxBytes: 64 * 1024,
} as const;

export const DEFAULT_JOB_SETTINGS = {
  timeoutSeconds: 300,
  maxRetries: 3,
  retryDelaySeconds: 30,
} as const;

export const JOB_SORTS = ['createdAt:desc', 'createdAt:asc'] as const;

export const PAGE_SIZES = [10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 20;
