import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ApiError } from '@/services/api/client';

/*
 * The backend reports invalid fields by their path in the *request body*
 * (e.g. "target.url", "jobTemplate.timeoutSeconds", "trigger.expression").
 * These tables map those paths onto form field names so the message appears
 * under the right input.
 */

const JOB_DEFINITION_FIELDS = {
  name: 'name',
  description: 'description',
  priority: 'priority',
  timeoutSeconds: 'timeoutSeconds',
  maxRetries: 'maxRetries',
  retryDelaySeconds: 'retryDelaySeconds',
  'target.taskType': 'taskType',
  'target.payload': 'payload',
  'target.method': 'method',
  'target.url': 'url',
  'target.body': 'body',
} as const;

export const CREATE_JOB_FIELD_MAP: Record<string, string> = {
  ...JOB_DEFINITION_FIELDS,
  scheduledAt: 'scheduledAt',
};

export const SCHEDULE_FIELD_MAP: Record<string, string> = {
  ...JOB_DEFINITION_FIELDS,
  'trigger.expression': 'cron',
  'trigger.timezone': 'timezone',
  'trigger.runAt': 'runAt',
};

/** Resolves a request path to a form field, trying parent paths ("target.payload.x" → payload). */
function resolveField(path: string, fieldMap: Record<string, string>): string | undefined {
  const parts = path.replace(/^jobTemplate\./, '').split('.');
  for (let length = parts.length; length > 0; length -= 1) {
    const field = fieldMap[parts.slice(0, length).join('.')];
    if (field) return field;
  }
  return undefined;
}

/**
 * Shows server-side field errors on the form. Returns how many were placed on
 * fields; anything unmatched is left to the form-level error message.
 */
export function applyServerFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fieldMap: Record<string, string>,
): number {
  if (!(error instanceof ApiError)) return 0;
  let applied = 0;
  for (const [path, message] of Object.entries(error.fieldErrors)) {
    const field = resolveField(path, fieldMap);
    if (!field) continue;
    setError(field as Path<T>, { type: 'server', message }, { shouldFocus: applied === 0 });
    applied += 1;
  }
  return applied;
}
