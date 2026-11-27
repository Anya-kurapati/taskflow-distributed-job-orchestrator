import { z } from 'zod';

import { jobErrorSchema, jobExecutionSchema, jobSchema } from './job.schema';
import { scheduleSchema } from './schedule.schema';

/**
 * Server-Sent Events contract for `GET /events` (one-way server → browser).
 *
 * Each SSE message has an `id` (monotonic, for `Last-Event-ID` resumption) and
 * a JSON `data` payload whose `type` field identifies the event. Unknown types
 * are ignored so the server can add events without breaking older clients.
 */

export const jobProgressSchema = z.object({
  /** 0–100. Only sent by tasks that can measure their progress. */
  percent: z.number().min(0).max(100),
  message: z.string().nullish(),
});

export const liveEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('job.created'), job: jobSchema }),
  /** Any other state change: paused, resumed, cancelled, queued, manual retry. */
  z.object({ type: z.literal('job.updated'), job: jobSchema }),
  z.object({ type: z.literal('job.started'), job: jobSchema, execution: jobExecutionSchema }),
  z.object({
    type: z.literal('job.progress'),
    jobId: z.string(),
    executionId: z.string(),
    progress: jobProgressSchema,
  }),
  z.object({ type: z.literal('job.completed'), job: jobSchema }),
  /** Final failure: no retries left. */
  z.object({ type: z.literal('job.failed'), job: jobSchema, error: jobErrorSchema }),
  /** An attempt failed and an automatic retry is scheduled. */
  z.object({
    type: z.literal('job.retry_scheduled'),
    job: jobSchema,
    error: jobErrorSchema,
    attempt: z.number().int().min(1),
    nextRunAt: z.string(),
  }),
  z.object({ type: z.literal('schedule.updated'), schedule: scheduleSchema }),
  z.object({ type: z.literal('schedule.deleted'), scheduleId: z.string() }),
]);
