import type { z } from 'zod';

import type {
  jobTemplateSchema,
  overlapPolicySchema,
  scheduleRequestSchema,
  scheduleSchema,
  scheduleStatusSchema,
  scheduleTriggerSchema,
  upcomingExecutionSchema,
} from '@/schemas/schedule.schema';

export type Schedule = z.infer<typeof scheduleSchema>;
export type ScheduleStatus = z.infer<typeof scheduleStatusSchema>;
export type ScheduleTrigger = z.infer<typeof scheduleTriggerSchema>;
export type OverlapPolicy = z.infer<typeof overlapPolicySchema>;
export type JobTemplate = z.infer<typeof jobTemplateSchema>;
export type ScheduleRequest = z.infer<typeof scheduleRequestSchema>;
export type UpcomingExecution = z.infer<typeof upcomingExecutionSchema>;
export type ScheduleAction = 'pause' | 'resume';
