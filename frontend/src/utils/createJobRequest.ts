import { DEFAULT_JOB_SETTINGS } from '@/constants/jobs';
import type { CreateJobFormValues } from '@/schemas/createJobForm.schema';
import type { JobDefinitionValues } from '@/schemas/jobDefinition.schema';
import type { CreateJobRequest, JobTarget } from '@/types/job';

export const JOB_DEFINITION_DEFAULTS: JobDefinitionValues = {
  name: '',
  description: '',
  priority: 'MEDIUM',
  kind: 'TASK',
  taskType: '',
  payload: '{}',
  method: 'POST',
  url: '',
  headers: [{ name: 'Content-Type', value: 'application/json' }],
  body: '',
  ...DEFAULT_JOB_SETTINGS,
};

export const CREATE_JOB_DEFAULTS: CreateJobFormValues = {
  ...JOB_DEFINITION_DEFAULTS,
  runMode: 'NOW',
  scheduledAt: '',
};

/** The job target described by validated form values. */
export function toJobTarget(values: JobDefinitionValues): JobTarget {
  if (values.kind === 'TASK') {
    return {
      kind: 'TASK',
      taskType: values.taskType,
      payload: JSON.parse(values.payload) as Record<string, unknown>,
    };
  }
  return {
    kind: 'HTTP',
    method: values.method,
    url: values.url.trim(),
    headers: Object.fromEntries(
      values.headers
        .filter((header) => header.name.trim())
        .map((header) => [header.name.trim(), header.value]),
    ),
    ...(values.body.trim() && { body: JSON.parse(values.body) as unknown }),
  };
}

/** Inverse of `toJobTarget`, for editing an existing definition. */
export function fromJobTarget(target: JobTarget): Partial<JobDefinitionValues> {
  if (target.kind === 'TASK') {
    return { kind: 'TASK', taskType: target.taskType, payload: pretty(target.payload) };
  }
  return {
    kind: 'HTTP',
    method: target.method,
    url: target.url,
    headers: Object.entries(target.headers).map(([name, value]) => ({ name, value })),
    body: target.body === undefined ? '' : pretty(target.body),
  };
}

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

/** Converts validated form values into the `POST /jobs` request body. */
export function toCreateJobRequest(values: CreateJobFormValues): CreateJobRequest {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    priority: values.priority,
    target: toJobTarget(values),
    // datetime-local values are local time; send an absolute UTC instant.
    scheduledAt: values.runMode === 'SCHEDULED' ? new Date(values.scheduledAt).toISOString() : null,
    timeoutSeconds: values.timeoutSeconds,
    maxRetries: values.maxRetries,
    retryDelaySeconds: values.retryDelaySeconds,
  };
}
