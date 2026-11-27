import { z } from 'zod';

import { JOB_LIMITS } from '@/constants/jobs';
import { OVERLAP_POLICIES, SCHEDULE_STATUSES } from '@/constants/schedules';
import { validateCronExpression } from '@/utils/cron';

import { createJobTargetSchema, jobPrioritySchema, jobTargetSchema } from './job.schema';

/**
 * Schedule API contract (provisional). A schedule is a job template plus a
 * trigger; each time the trigger fires the backend creates a job from the
 * template. See the README's "API contract" for scheduler semantics.
 */

const count = z.number().int().nonnegative();

export const scheduleStatusSchema = z.enum(SCHEDULE_STATUSES);
export const overlapPolicySchema = z.enum(OVERLAP_POLICIES);

const onceTriggerSchema = z.object({ type: z.literal('ONCE'), runAt: z.string() });
const cronTriggerSchema = z.object({
  type: z.literal('CRON'),
  expression: z.string(),
  /** IANA timezone the expression is evaluated in. */
  timezone: z.string(),
});

export const scheduleTriggerSchema = z.discriminatedUnion('type', [
  onceTriggerSchema,
  cronTriggerSchema,
]);

export const jobTemplateSchema = z.object({
  priority: jobPrioritySchema,
  target: jobTargetSchema,
  timeoutSeconds: count,
  maxRetries: count,
  retryDelaySeconds: count,
});

export const scheduleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  status: scheduleStatusSchema,
  trigger: scheduleTriggerSchema,
  overlapPolicy: overlapPolicySchema,
  jobTemplate: jobTemplateSchema,
  /** Next fire time; null when paused or completed. */
  nextRunAt: z.string().nullish(),
  lastRunAt: z.string().nullish(),
  /** Job created by the most recent run, if any. */
  lastJobId: z.string().nullish(),
  /** CREATED, or SKIPPED when the overlap policy skipped the run. */
  lastRunOutcome: z.enum(['CREATED', 'SKIPPED']).nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const scheduleListSchema = z.array(scheduleSchema);

export const upcomingExecutionSchema = z.object({
  scheduleId: z.string(),
  scheduleName: z.string(),
  runAt: z.string(),
});

export const upcomingExecutionListSchema = z.array(upcomingExecutionSchema);

/** POST /schedules and PUT /schedules/:id body. The backend must validate it independently. */
export const scheduleRequestSchema = z.object({
  name: z.string().trim().min(JOB_LIMITS.nameMin).max(JOB_LIMITS.nameMax),
  description: z.string().max(JOB_LIMITS.descriptionMax).nullish(),
  trigger: z.discriminatedUnion('type', [
    onceTriggerSchema.extend({ runAt: z.iso.datetime({ offset: true }) }),
    cronTriggerSchema.superRefine((trigger, ctx) => {
      const problem = validateCronExpression(trigger.expression, trigger.timezone);
      if (problem) ctx.addIssue({ code: 'custom', message: problem, path: ['expression'] });
    }),
  ]),
  overlapPolicy: overlapPolicySchema,
  jobTemplate: jobTemplateSchema.extend({
    target: createJobTargetSchema,
    timeoutSeconds: z
      .number()
      .int()
      .min(JOB_LIMITS.timeoutSecondsMin)
      .max(JOB_LIMITS.timeoutSecondsMax),
    maxRetries: z.number().int().min(0).max(JOB_LIMITS.maxRetriesMax),
    retryDelaySeconds: z.number().int().min(0).max(JOB_LIMITS.retryDelaySecondsMax),
  }),
});
