import { z } from 'zod';

import { TRIGGER_TYPES } from '@/constants/schedules';
import { validateCronExpression } from '@/utils/cron';

import { jobDefinitionShape, refineJobDefinition } from './jobDefinition.schema';

/** The schedule form: a job definition (the template) plus a trigger. */
export const scheduleFormSchema = z
  .object({
    ...jobDefinitionShape,
    triggerType: z.enum(TRIGGER_TYPES),
    /** One-time: local date-time from a datetime-local input. */
    runAt: z.string(),
    /** Recurring: 5-field cron expression evaluated in `timezone`. */
    cron: z.string().trim(),
    timezone: z.string(),
    /** Recurring: skip a run while the previous job is still waiting or running. */
    skipIfRunning: z.boolean(),
  })
  .superRefine((values, ctx) => {
    refineJobDefinition(values, ctx);
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message });

    if (values.triggerType === 'ONCE') {
      const time = Date.parse(values.runAt);
      if (!values.runAt || Number.isNaN(time)) issue('runAt', 'Choose a date and time');
      else if (time <= Date.now()) issue('runAt', 'Choose a time in the future');
      return;
    }

    const problem = validateCronExpression(values.cron, values.timezone);
    if (problem) issue(problem === 'Choose a valid timezone' ? 'timezone' : 'cron', problem);
  });

export type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;
