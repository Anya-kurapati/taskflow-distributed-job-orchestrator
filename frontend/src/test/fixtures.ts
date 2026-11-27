import type { Job, JobExecution } from '@/types/job';

export function buildJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-123',
    name: 'Nightly report',
    description: 'Builds the nightly usage report',
    type: 'report.generate',
    status: 'RUNNING',
    priority: 'HIGH',
    target: { kind: 'TASK', taskType: 'report.generate', payload: { report: 'nightly' } },
    timeoutSeconds: 300,
    maxRetries: 3,
    retryDelaySeconds: 30,
    attempts: 1,
    createdAt: '2026-11-26T10:00:00Z',
    updatedAt: '2026-11-26T10:00:05Z',
    scheduledAt: null,
    nextRunAt: null,
    startedAt: '2026-11-26T10:00:05Z',
    completedAt: null,
    lastError: null,
    ...overrides,
  };
}

export function buildExecution(overrides: Partial<JobExecution> = {}): JobExecution {
  return {
    id: 'job-123-attempt-1',
    jobId: 'job-123',
    attempt: 1,
    status: 'SUCCEEDED',
    startedAt: '2026-11-26T10:00:05Z',
    finishedAt: '2026-11-26T10:01:05Z',
    durationMs: 60_000,
    workerId: 'worker-1',
    error: null,
    ...overrides,
  };
}
