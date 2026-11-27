import { z } from 'zod';

import { jobDefinitionShape, refineJobDefinition } from './jobDefinition.schema';

export { parseJson } from './jobDefinition.schema';

/** The create-job form: a job definition plus when to run it (now, or once later). */
export const createJobFormSchema = z
  .object({
    ...jobDefinitionShape,
    runMode: z.enum(['NOW', 'SCHEDULED']),
    scheduledAt: z.string(),
  })
  .superRefine((values, ctx) => {
    refineJobDefinition(values, ctx);

    if (values.runMode === 'SCHEDULED') {
      const time = Date.parse(values.scheduledAt);
      if (!values.scheduledAt || Number.isNaN(time)) {
        ctx.addIssue({ code: 'custom', path: ['scheduledAt'], message: 'Choose a date and time' });
      } else if (time <= Date.now()) {
        ctx.addIssue({
          code: 'custom',
          path: ['scheduledAt'],
          message: 'Choose a time in the future',
        });
      }
    }
  });

export type CreateJobFormValues = z.infer<typeof createJobFormSchema>;
