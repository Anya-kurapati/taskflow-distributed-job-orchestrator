import { z } from 'zod';

import {
  EXECUTION_STATUSES,
  HTTP_METHODS,
  JOB_LIMITS,
  JOB_PRIORITIES,
  JOB_STATUSES,
} from '@/constants/jobs';

import { pageSchema } from './api.schema';

/**
 * Job API contract (provisional until the backend exists — see the README's
 * "API contract"). Responses are parsed through these schemas so contract
 * drift is caught at the API boundary rather than deep inside a component.
 */

const count = z.number().int().nonnegative();
const jsonObject = z.record(z.string(), z.unknown());

export const jobStatusSchema = z.enum(JOB_STATUSES);
export const executionStatusSchema = z.enum(EXECUTION_STATUSES);
export const jobPrioritySchema = z.enum(JOB_PRIORITIES);
export const httpMethodSchema = z.enum(HTTP_METHODS);
/**
 * Webhook URLs must be http(s). The backend must additionally block internal
 * and private addresses (SSRF protection) — that can't be enforced client-side.
 */
export const httpUrlSchema = z.url({ protocol: /^https?$/ });

export const jobErrorSchema = z.object({
  message: z.string(),
  code: z.string().nullish(),
  /** Extra diagnostics, e.g. a stack trace or response excerpt. */
  details: z.string().nullish(),
});

/** Runs a task type registered with the workers. */
export const taskTargetSchema = z.object({
  kind: z.literal('TASK'),
  taskType: z.string().min(1),
  payload: jsonObject,
});

/** Calls an HTTP endpoint. */
export const httpTargetSchema = z.object({
  kind: z.literal('HTTP'),
  method: httpMethodSchema,
  url: z.string(),
  headers: z.record(z.string(), z.string()),
  body: z.unknown().optional(),
});

export const jobTargetSchema = z.discriminatedUnion('kind', [taskTargetSchema, httpTargetSchema]);

export const jobSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  /** Registered task type, or `http.webhook`. */
  type: z.string(),
  status: jobStatusSchema,
  priority: jobPrioritySchema,
  target: jobTargetSchema,
  timeoutSeconds: count,
  maxRetries: count,
  retryDelaySeconds: count,
  /** Number of execution attempts so far. */
  attempts: count,
  createdAt: z.string(),
  updatedAt: z.string(),
  /** Requested first run time, for jobs scheduled in advance. */
  scheduledAt: z.string().nullish(),
  /** When the next attempt is due (scheduled jobs and pending retries). */
  nextRunAt: z.string().nullish(),
  /** Start of the most recent attempt. */
  startedAt: z.string().nullish(),
  /** When the job reached a final state. */
  completedAt: z.string().nullish(),
  lastError: jobErrorSchema.nullish(),
  /** Set when the job was created by a schedule. */
  scheduleId: z.string().nullish(),
});

export const jobListSchema = z.array(jobSchema);
export const jobPageSchema = pageSchema(jobSchema);

export const jobExecutionSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  attempt: z.number().int().min(1),
  status: executionStatusSchema,
  startedAt: z.string(),
  finishedAt: z.string().nullish(),
  durationMs: count.nullish(),
  workerId: z.string().nullish(),
  error: jobErrorSchema.nullish(),
});

export const jobExecutionListSchema = z.array(jobExecutionSchema);

export const taskTypeSchema = z.object({
  type: z.string(),
  name: z.string(),
  description: z.string(),
  examplePayload: jsonObject,
});

export const taskTypeListSchema = z.array(taskTypeSchema);

/** A target in a create request: like jobTargetSchema, but URLs must be valid http(s). */
export const createJobTargetSchema = z.discriminatedUnion('kind', [
  taskTargetSchema,
  httpTargetSchema.extend({ url: httpUrlSchema }),
]);

/** POST /jobs request body. The backend must validate it independently. */
export const createJobRequestSchema = z.object({
  name: z.string().trim().min(JOB_LIMITS.nameMin).max(JOB_LIMITS.nameMax),
  description: z.string().max(JOB_LIMITS.descriptionMax).nullish(),
  priority: jobPrioritySchema,
  target: createJobTargetSchema,
  scheduledAt: z.iso.datetime({ offset: true }).nullish(),
  timeoutSeconds: z
    .number()
    .int()
    .min(JOB_LIMITS.timeoutSecondsMin)
    .max(JOB_LIMITS.timeoutSecondsMax),
  maxRetries: z.number().int().min(0).max(JOB_LIMITS.maxRetriesMax),
  retryDelaySeconds: z.number().int().min(0).max(JOB_LIMITS.retryDelaySecondsMax),
});
