import { z } from 'zod';

import { JOB_KINDS, JOB_LIMITS } from '@/constants/jobs';

import { httpMethodSchema, httpUrlSchema, jobPrioritySchema } from './job.schema';

/**
 * Form fields that define *what a job does*: shared by the create-job form and
 * the schedule form (a schedule is a job template plus a trigger). The fields
 * are flat — both target kinds always exist — so React Hook Form can type every
 * field; `refineJobDefinition` validates only those relevant to the chosen kind.
 */

/** RFC 7230 header field-name characters. */
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

const seconds = (label: string, min: number, max: number) =>
  z
    .number({ error: 'Enter a number' })
    .int('Use whole seconds')
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must be at most ${max.toLocaleString()}`);

export function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const byteLength = (text: string) => new TextEncoder().encode(text).length;

export const jobDefinitionShape = {
  name: z
    .string()
    .trim()
    .min(JOB_LIMITS.nameMin, `Name must be at least ${JOB_LIMITS.nameMin} characters`)
    .max(JOB_LIMITS.nameMax, `Name must be at most ${JOB_LIMITS.nameMax} characters`),
  description: z
    .string()
    .trim()
    .max(
      JOB_LIMITS.descriptionMax,
      `Description must be at most ${JOB_LIMITS.descriptionMax} characters`,
    ),
  priority: jobPrioritySchema,
  kind: z.enum(JOB_KINDS),
  // Registered task
  taskType: z.string(),
  payload: z.string(),
  // HTTP webhook
  method: httpMethodSchema,
  url: z.string().trim(),
  headers: z.array(z.object({ name: z.string().trim(), value: z.string() })),
  body: z.string(),
  // Timeout & retry policy
  timeoutSeconds: seconds('Timeout', JOB_LIMITS.timeoutSecondsMin, JOB_LIMITS.timeoutSecondsMax),
  maxRetries: z
    .number({ error: 'Enter a number' })
    .int('Use a whole number')
    .min(0, 'Retries cannot be negative')
    .max(JOB_LIMITS.maxRetriesMax, `At most ${JOB_LIMITS.maxRetriesMax} retries`),
  retryDelaySeconds: seconds('Retry delay', 0, JOB_LIMITS.retryDelaySecondsMax),
};

export type JobDefinitionValues = z.infer<z.ZodObject<typeof jobDefinitionShape>>;

/** Cross-field validation for the job definition fields. */
export function refineJobDefinition(values: JobDefinitionValues, ctx: z.RefinementCtx) {
  const issue = (path: (string | number)[], message: string) =>
    ctx.addIssue({ code: 'custom', path, message });

  if (values.kind === 'TASK') {
    if (!values.taskType) issue(['taskType'], 'Select a task type');
    const payload = parseJson(values.payload);
    if (!payload.ok) issue(['payload'], 'Payload must be valid JSON');
    else if (!isPlainObject(payload.value)) issue(['payload'], 'Payload must be a JSON object');
    else if (byteLength(values.payload) > JOB_LIMITS.payloadMaxBytes) {
      issue(['payload'], 'Payload must be 64 KB or smaller');
    }
    return;
  }

  if (!httpUrlSchema.safeParse(values.url).success) {
    issue(['url'], 'Enter a valid http:// or https:// URL');
  }
  const seen = new Set<string>();
  values.headers.forEach((header, index) => {
    if (!header.name && !header.value) return; // empty row is ignored
    if (!HEADER_NAME.test(header.name)) {
      issue(['headers', index, 'name'], 'Enter a valid header name');
    } else if (seen.has(header.name.toLowerCase())) {
      issue(['headers', index, 'name'], 'Duplicate header');
    }
    seen.add(header.name.toLowerCase());
  });
  if (values.body.trim()) {
    if (values.method === 'GET') issue(['body'], 'GET requests cannot have a body');
    else if (!parseJson(values.body).ok) issue(['body'], 'Body must be valid JSON');
    else if (byteLength(values.body) > JOB_LIMITS.payloadMaxBytes) {
      issue(['body'], 'Body must be 64 KB or smaller');
    }
  }
}
