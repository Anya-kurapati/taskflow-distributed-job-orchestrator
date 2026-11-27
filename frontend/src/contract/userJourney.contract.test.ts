import { afterAll, describe, expect, it } from 'vitest';

import { env } from '@/config/env';
import {
  ApiError,
  dashboardService,
  jobsService,
  schedulesService,
  taskTypesService,
} from '@/services/api';
import type { CreateJobRequest, Job, TaskType } from '@/types/job';
import type { Schedule, ScheduleRequest } from '@/types/schedule';

/**
 * The complete user journey, driven through the app's real service layer — so
 * every response is also validated against the frontend's Zod schemas. Point it
 * at the Spring Boot backend to verify the integration end to end:
 *
 *   CONTRACT_API_URL=http://localhost:8080/api/v1 npm run test:contract
 *
 * Optional: CONTRACT_WAIT_FOR_COMPLETION=true also waits (up to 60s) for a job
 * to be picked up by a worker and finish.
 *
 * Note: against a real backend this creates data (jobs can't be deleted via the
 * API); created jobs are cancelled and schedules deleted afterwards. Use a
 * development database.
 */

// Flags are passed through by vitest.contract.config.ts.
const flag = (name: string) => String(import.meta.env[name]) === 'true';
const usingMocks = flag('CONTRACT_USE_MOCKS');
const waitForCompletion = flag('CONTRACT_WAIT_FOR_COMPLETION');
const runId = `contract-${Date.now()}`;

const state: {
  taskType?: TaskType;
  job?: Job;
  schedule?: Schedule;
} = {};
const createdJobIds: string[] = [];

function jobRequest(name: string, taskType: TaskType): CreateJobRequest {
  return {
    name,
    description: 'Created by the contract test suite',
    priority: 'LOW',
    target: { kind: 'TASK', taskType: taskType.type, payload: taskType.examplePayload },
    scheduledAt: null,
    timeoutSeconds: 60,
    maxRetries: 1,
    retryDelaySeconds: 5,
  };
}

async function expectApiError(promise: Promise<unknown>, status: number) {
  const error = await promise.then(
    () => {
      throw new Error(`Expected the request to fail with ${status}`);
    },
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(status);
  expect((error as ApiError).message).not.toBe('');
  return error as ApiError;
}

afterAll(async () => {
  // Best-effort cleanup so repeated runs don't pile up active work.
  await Promise.allSettled([
    ...createdJobIds.map((id) => jobsService.cancel(id)),
    ...(state.schedule ? [schedulesService.remove(state.schedule.id)] : []),
  ]);
});

describe(`user journey against ${env.apiBaseUrl}${usingMocks ? ' (mock API)' : ''}`, () => {
  it('lists the registered task types', async () => {
    const taskTypes = await taskTypesService.list();
    expect(taskTypes.length).toBeGreaterThan(0);
    state.taskType = taskTypes[0];
  });

  it('loads the dashboard', async () => {
    const [summary, trends, recent] = await Promise.all([
      dashboardService.getSummary(),
      dashboardService.getTrends('7d'),
      dashboardService.getRecentExecutions(8),
    ]);
    expect(summary.totalJobs).toBeGreaterThanOrEqual(summary.successfulJobs + summary.failedJobs);
    expect(trends.points).toHaveLength(7);
    expect(recent.length).toBeLessThanOrEqual(8);
  });

  it('creates a job', async () => {
    const job = await jobsService.create(jobRequest(`${runId} job`, state.taskType!));
    createdJobIds.push(job.id);
    expect(job).toMatchObject({ name: `${runId} job`, type: state.taskType!.type, attempts: 0 });
    expect(['PENDING', 'QUEUED', 'RUNNING']).toContain(job.status);
    state.job = job;
  });

  it('rejects invalid job definitions with a 400', async () => {
    const error = await expectApiError(
      jobsService.create({ ...jobRequest('x', state.taskType!), timeoutSeconds: 0 }),
      400,
    );
    // Field errors are optional, but if present they must use request paths.
    for (const field of Object.keys(error.fieldErrors)) expect(field).toMatch(/^[\w.[\]]+$/);
  });

  it('finds the job by search, status filter and id', async () => {
    const page = await jobsService.list({ search: runId, pageSize: 10 });
    expect(page.items.map((job) => job.id)).toContain(state.job!.id);
    expect(page).toMatchObject({ page: 1, pageSize: 10 });
    expect(page.totalPages).toBeGreaterThanOrEqual(1);

    const byId = await jobsService.getById(state.job!.id);
    expect(byId.id).toBe(state.job!.id);
    await expectApiError(jobsService.getById(`${runId}-missing`), 404);
  });

  it('returns the execution history', async () => {
    const executions = await jobsService.getExecutions(state.job!.id);
    expect(Array.isArray(executions)).toBe(true);
  });

  it('pauses, resumes and cancels a waiting job (or rejects invalid transitions)', async () => {
    const current = await jobsService.getById(state.job!.id);
    if (['PENDING', 'QUEUED', 'SCHEDULED'].includes(current.status)) {
      expect((await jobsService.pause(current.id)).status).toBe('PAUSED');
      expect(['QUEUED', 'SCHEDULED']).toContain((await jobsService.resume(current.id)).status);
    }
    const latest = await jobsService.getById(state.job!.id);
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(latest.status)) {
      await expectApiError(jobsService.cancel(latest.id), 409);
    } else {
      expect((await jobsService.cancel(latest.id)).status).toBe('CANCELLED');
      await expectApiError(jobsService.cancel(latest.id), 409);
    }
  });

  it.runIf(waitForCompletion)('runs a job to completion on a worker', async () => {
    const job = await jobsService.create(jobRequest(`${runId} run`, state.taskType!));
    createdJobIds.push(job.id);
    const deadline = Date.now() + 60_000;
    let current = job;
    while (!['COMPLETED', 'FAILED'].includes(current.status) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      current = await jobsService.getById(job.id);
    }
    expect(['COMPLETED', 'FAILED']).toContain(current.status);
    const executions = await jobsService.getExecutions(job.id);
    expect(executions.length).toBe(current.attempts);
  });

  it('manages a recurring schedule end to end', async () => {
    const request: ScheduleRequest = {
      name: `${runId} schedule`,
      description: null,
      trigger: { type: 'CRON', expression: '0 3 * * *', timezone: 'UTC' },
      overlapPolicy: 'SKIP',
      jobTemplate: {
        priority: 'LOW',
        target: { kind: 'TASK', taskType: state.taskType!.type, payload: {} },
        timeoutSeconds: 60,
        maxRetries: 0,
        retryDelaySeconds: 0,
      },
    };

    const created = await schedulesService.create(request);
    state.schedule = created;
    expect(created.status).toBe('ACTIVE');
    expect(new Date(created.nextRunAt!).getUTCHours()).toBe(3);

    // "Upcoming" is the soonest N runs across ALL schedules, soonest first; ours
    // must appear if its next run falls inside that window.
    const upcoming = await schedulesService.upcoming(100);
    const times = upcoming.map((run) => Date.parse(run.runAt));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    const windowEnd = times.at(-1) ?? 0;
    if (upcoming.length < 100 || Date.parse(created.nextRunAt!) <= windowEnd) {
      expect(upcoming.some((run) => run.scheduleId === created.id)).toBe(true);
    }

    expect((await schedulesService.runAction(created.id, 'pause')).status).toBe('PAUSED');
    await expectApiError(schedulesService.runAction(created.id, 'pause'), 409);
    expect((await schedulesService.runAction(created.id, 'resume')).status).toBe('ACTIVE');

    const updated = await schedulesService.update(created.id, {
      ...request,
      trigger: { type: 'CRON', expression: '30 4 * * 1-5', timezone: 'Europe/London' },
    });
    expect(updated.trigger).toMatchObject({
      expression: '30 4 * * 1-5',
      timezone: 'Europe/London',
    });

    await expectApiError(
      schedulesService.create({
        ...request,
        trigger: { type: 'CRON', expression: '0 0 31 2 *', timezone: 'UTC' },
      }),
      400,
    );

    await schedulesService.remove(created.id);
    state.schedule = undefined;
    await expectApiError(schedulesService.getById(created.id), 404);
  });

  it.skipIf(usingMocks)('streams live updates over Server-Sent Events', async () => {
    // The mock SSE stream only exists in the browser; against a backend, check
    // the stream opens with the right content type.
    const controller = new AbortController();
    const response = await fetch(`${env.apiBaseUrl}/events`, {
      headers: { Accept: 'text/event-stream' },
      signal: controller.signal,
    });
    try {
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toMatch(/^text\/event-stream/);
    } finally {
      controller.abort();
    }
  });
});
