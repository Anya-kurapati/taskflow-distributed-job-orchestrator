import { describe, expect, it } from 'vitest';

import { ApiError, dashboardService, jobsService, taskTypesService } from '@/services/api';
import type { CreateJobRequest, JobStatus } from '@/types/job';

import { mockDb } from './db';

// These tests call the real service layer (Axios + Zod parsing) against the
// mock API, so they fail if the mocks drift from the frontend's contract.

const taskJob: CreateJobRequest = {
  name: 'Test job',
  description: null,
  priority: 'LOW',
  target: { kind: 'TASK', taskType: 'email.send', payload: { recipients: ['a@example.com'] } },
  scheduledAt: null,
  timeoutSeconds: 60,
  maxRetries: 1,
  retryDelaySeconds: 10,
};

const jobWithStatus = (status: JobStatus) => mockDb.jobs.find((job) => job.status === status)!;

describe('mock API: listing jobs', () => {
  it('paginates with totals', async () => {
    const page1 = await jobsService.list({ page: 1, pageSize: 10 });
    const page2 = await jobsService.list({ page: 2, pageSize: 10 });

    expect(page1.items).toHaveLength(10);
    expect(page1.totalItems).toBe(mockDb.jobs.length);
    expect(page1.totalPages).toBe(Math.ceil(mockDb.jobs.length / 10));
    expect(page2.items[0]!.id).not.toBe(page1.items[0]!.id);
  });

  it('searches by name (case-insensitive) and filters by status and type', async () => {
    const result = await jobsService.list({
      search: 'SEND EMAIL',
      status: 'COMPLETED',
      type: 'email.send',
      pageSize: 50,
    });

    expect(result.totalItems).toBeGreaterThan(0);
    for (const job of result.items) {
      expect(job.name.toLowerCase()).toContain('send email');
      expect(job.status).toBe('COMPLETED');
      expect(job.type).toBe('email.send');
    }
  });

  it('sorts by creation date in either direction', async () => {
    const newest = await jobsService.list({ sort: 'createdAt:desc', pageSize: 50 });
    const oldest = await jobsService.list({ sort: 'createdAt:asc', pageSize: 50 });
    const times = (items: { createdAt: string }[]) => items.map((j) => Date.parse(j.createdAt));

    expect(times(newest.items)).toEqual([...times(newest.items)].sort((a, b) => b - a));
    expect(times(oldest.items)).toEqual([...times(oldest.items)].sort((a, b) => a - b));
  });
});

describe('mock API: creating jobs', () => {
  it('creates a queued task job that is reflected in the summary', async () => {
    const before = await dashboardService.getSummary();
    const job = await jobsService.create(taskJob);

    expect(job).toMatchObject({ status: 'QUEUED', type: 'email.send', attempts: 0 });
    await expect(jobsService.getExecutions(job.id)).resolves.toEqual([]);
    const after = await dashboardService.getSummary();
    expect(after.totalJobs).toBe(before.totalJobs + 1);
    expect(after.pendingJobs).toBe(before.pendingJobs + 1);
  });

  it('schedules jobs with a future start time', async () => {
    const scheduledAt = new Date(Date.now() + 3_600_000).toISOString();
    const job = await jobsService.create({ ...taskJob, scheduledAt });

    expect(job.status).toBe('SCHEDULED');
    expect(job.nextRunAt).toBe(scheduledAt);
  });

  it('creates HTTP webhook jobs', async () => {
    const job = await jobsService.create({
      ...taskJob,
      target: { kind: 'HTTP', method: 'POST', url: 'https://example.com/hook', headers: {} },
    });
    expect(job.type).toBe('http.webhook');
  });

  it('rejects unregistered task types and non-http URLs', async () => {
    await expect(
      jobsService.create({
        ...taskJob,
        target: { kind: 'TASK', taskType: 'shell.exec', payload: {} },
      }),
    ).rejects.toMatchObject({ status: 400, message: 'Unknown task type "shell.exec"' });
    await expect(
      jobsService.create({
        ...taskJob,
        target: { kind: 'HTTP', method: 'GET', url: 'file:///etc/passwd', headers: {} },
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('lists the registered task types', async () => {
    const types = await taskTypesService.list();
    expect(types.map((type) => type.type)).toContain('email.send');
  });
});

describe('mock API: job lifecycle', () => {
  it('returns execution history newest first', async () => {
    const failed = jobWithStatus('FAILED');
    const executions = await jobsService.getExecutions(failed.id);

    expect(executions).toHaveLength(failed.attempts);
    expect(executions.map((run) => run.attempt)).toEqual(
      [...executions.map((run) => run.attempt)].sort((a, b) => b - a),
    );
    expect(executions.every((run) => run.error)).toBe(true);
  });

  it('retries failed jobs only', async () => {
    const failed = jobWithStatus('FAILED');
    await expect(jobsService.retry(failed.id)).resolves.toMatchObject({ status: 'QUEUED' });
    await expect(jobsService.retry(jobWithStatus('COMPLETED').id)).rejects.toMatchObject({
      status: 409,
    });
  });

  it('pauses and resumes a scheduled job', async () => {
    const scheduled = mockDb.jobs.find((job) => job.status === 'SCHEDULED' && job.attempts === 0)!;

    await expect(jobsService.pause(scheduled.id)).resolves.toMatchObject({ status: 'PAUSED' });
    await expect(jobsService.resume(scheduled.id)).resolves.toMatchObject({
      status: 'SCHEDULED',
    });
  });

  it('cancels a running job and its running attempt', async () => {
    const running = jobWithStatus('RUNNING');

    await expect(jobsService.cancel(running.id)).resolves.toMatchObject({ status: 'CANCELLED' });
    const [latest] = await jobsService.getExecutions(running.id);
    expect(latest!.status).toBe('CANCELLED');
  });

  it('rejects invalid transitions with 409 and unknown jobs with 404', async () => {
    await expect(jobsService.cancel(jobWithStatus('COMPLETED').id)).rejects.toMatchObject({
      status: 409,
    });
    await expect(jobsService.pause(jobWithStatus('RUNNING').id)).rejects.toMatchObject({
      status: 409,
    });
    await expect(jobsService.getById('nope')).rejects.toBeInstanceOf(ApiError);
  });
});
