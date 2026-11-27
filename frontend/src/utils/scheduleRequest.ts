import { CRON_PRESETS } from '@/constants/schedules';
import type { ScheduleFormValues } from '@/schemas/scheduleForm.schema';
import type { Schedule, ScheduleRequest, ScheduleTrigger } from '@/types/schedule';

import { fromJobTarget, JOB_DEFINITION_DEFAULTS, toJobTarget } from './createJobRequest';
import { localTimeZone } from './cron';
import { formatDateTime } from './format';

export function scheduleFormDefaults(): ScheduleFormValues {
  return {
    ...JOB_DEFINITION_DEFAULTS,
    triggerType: 'CRON',
    runAt: '',
    cron: '0 9 * * 1-5',
    timezone: localTimeZone(),
    skipIfRunning: true,
  };
}

/** ISO instant → value for a `datetime-local` input (local wall-clock time). */
export function toDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function toScheduleRequest(values: ScheduleFormValues): ScheduleRequest {
  const trigger: ScheduleTrigger =
    values.triggerType === 'ONCE'
      ? { type: 'ONCE', runAt: new Date(values.runAt).toISOString() }
      : { type: 'CRON', expression: values.cron.trim(), timezone: values.timezone };

  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    trigger,
    overlapPolicy: values.skipIfRunning ? 'SKIP' : 'ALLOW',
    jobTemplate: {
      priority: values.priority,
      target: toJobTarget(values),
      timeoutSeconds: values.timeoutSeconds,
      maxRetries: values.maxRetries,
      retryDelaySeconds: values.retryDelaySeconds,
    },
  };
}

/** Existing schedule → form values, for editing. */
export function toScheduleFormValues(schedule: Schedule): ScheduleFormValues {
  const defaults = scheduleFormDefaults();
  const { trigger, jobTemplate } = schedule;
  return {
    ...defaults,
    ...fromJobTarget(jobTemplate.target),
    name: schedule.name,
    description: schedule.description ?? '',
    priority: jobTemplate.priority,
    timeoutSeconds: jobTemplate.timeoutSeconds,
    maxRetries: jobTemplate.maxRetries,
    retryDelaySeconds: jobTemplate.retryDelaySeconds,
    triggerType: trigger.type,
    runAt: trigger.type === 'ONCE' ? toDateTimeLocal(trigger.runAt) : '',
    cron: trigger.type === 'CRON' ? trigger.expression : defaults.cron,
    timezone: trigger.type === 'CRON' ? trigger.timezone : defaults.timezone,
    skipIfRunning: schedule.overlapPolicy === 'SKIP',
  };
}

/** Short description of when a trigger fires, e.g. "Weekdays at 09:00". */
export function describeTrigger(trigger: ScheduleTrigger): string {
  if (trigger.type === 'ONCE') return `Once, ${formatDateTime(trigger.runAt)}`;
  const preset = CRON_PRESETS.find((candidate) => candidate.expression === trigger.expression);
  return preset?.label ?? 'Custom schedule';
}
