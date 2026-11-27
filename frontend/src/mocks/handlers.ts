import { delay, http, HttpResponse, sse } from 'msw';

import { env } from '@/config/env';
import { trendRangeSchema } from '@/schemas/dashboard.schema';
import { createJobRequestSchema } from '@/schemas/job.schema';
import { scheduleRequestSchema } from '@/schemas/schedule.schema';
import type { JobAction, JobTarget } from '@/types/job';
import type { ScheduleAction } from '@/types/schedule';
import { isActionAllowed } from '@/utils/jobActions';
import { parseJobListQuery } from '@/utils/jobListQuery';

import {
  applyAction,
  computeSummary,
  computeTrends,
  findJob,
  insertJob,
  listJobs,
  mockDb,
  recentExecutions,
} from './db';
import { publish, subscribe } from './events';
import {
  createSchedule,
  deleteSchedule,
  findSchedule,
  listSchedules,
  pauseSchedule,
  resumeSchedule,
  ScheduleConflictError,
  updateSchedule,
  upcomingExecutions,
} from './schedules';
import { isRegisteredTaskType, MOCK_TASK_TYPES } from './taskTypes';

/** Absolute URL for an API path, matching what the Axios client requests. */
export const apiUrl = (path: string) => `${env.apiBaseUrl}${path}`;

const error = (status: number, message: string) => HttpResponse.json({ message }, { status });

/** Rejects targets the workers can't run (only registered task types are allowed). */
const unknownTaskType = (target: JobTarget) =>
  target.kind === 'TASK' && !isRegisteredTaskType(target.taskType)
    ? error(400, `Unknown task type "${target.taskType}"`)
    : null;

const ACTION_VERBS: Record<JobAction, string> = {
  retry: 'retried',
  pause: 'paused',
  resume: 'resumed',
  cancel: 'cancelled',
};

const jobActionHandler = (action: JobAction) =>
  http.post<{ id: string }>(apiUrl(`/jobs/:id/${action}`), async ({ params }) => {
    await delay();
    const job = findJob(params.id);
    if (!job) return error(404, 'Job not found');
    if (!isActionAllowed(action, job.status)) {
      return error(409, `A ${job.status.toLowerCase()} job cannot be ${ACTION_VERBS[action]}`);
    }
    applyAction(job, action);
    publish({ type: 'job.updated', job });
    return HttpResponse.json(job);
  });

const scheduleActionHandler = (action: ScheduleAction) =>
  http.post<{ id: string }>(apiUrl(`/schedules/:id/${action}`), async ({ params }) => {
    await delay();
    const schedule = findSchedule(params.id);
    if (!schedule) return error(404, 'Schedule not found');
    try {
      if (action === 'pause') pauseSchedule(schedule);
      else resumeSchedule(schedule);
    } catch (conflict) {
      if (conflict instanceof ScheduleConflictError) return error(409, conflict.message);
      throw conflict;
    }
    publish({ type: 'schedule.updated', schedule });
    return HttpResponse.json(schedule);
  });

/**
 * `GET /events` — the live-updates SSE stream. Created on demand because MSW
 * can only build SSE handlers where `EventSource` exists (not in jsdom tests;
 * those inject a fake EventSource into the provider instead).
 */
export const createLiveEventsHandler = () =>
  sse(apiUrl('/events'), ({ client, request }) => {
    const unsubscribe = subscribe((event, id) => client.send({ id: String(id), data: event }));
    request.signal.addEventListener('abort', unsubscribe);
  });

/**
 * Mock implementation of the TaskFlow REST API. Shared by the browser worker
 * (development) and the Node server (tests) so both exercise the same contract.
 */
export const handlers = [
  // --- Dashboard -----------------------------------------------------------
  http.get(apiUrl('/dashboard/summary'), async () => {
    await delay();
    return HttpResponse.json(computeSummary(mockDb.jobs));
  }),

  http.get(apiUrl('/dashboard/trends'), async ({ request }) => {
    await delay();
    const range = trendRangeSchema.safeParse(new URL(request.url).searchParams.get('range'));
    if (!range.success) return error(400, 'range must be one of 24h, 7d, 30d');
    return HttpResponse.json(computeTrends(mockDb.jobs, range.data));
  }),

  http.get(apiUrl('/dashboard/recent-executions'), async ({ request }) => {
    await delay();
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? 10);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return error(400, 'limit must be an integer between 1 and 100');
    }
    return HttpResponse.json(recentExecutions(mockDb.jobs, limit));
  }),

  // --- Task types ----------------------------------------------------------
  http.get(apiUrl('/task-types'), async () => {
    await delay();
    return HttpResponse.json(MOCK_TASK_TYPES);
  }),

  // --- Jobs ----------------------------------------------------------------
  http.get(apiUrl('/jobs'), async ({ request }) => {
    await delay();
    // Same lenient parsing as the UI: unknown values fall back to defaults.
    const query = parseJobListQuery(new URL(request.url).searchParams);
    return HttpResponse.json(
      listJobs({
        search: query.search,
        status: query.status || undefined,
        type: query.type || undefined,
        sort: query.sort,
        page: query.page,
        pageSize: query.pageSize,
      }),
    );
  }),

  http.post(apiUrl('/jobs'), async ({ request }) => {
    await delay();
    const parsed = createJobRequestSchema.safeParse(await request.json());
    if (!parsed.success) return error(400, 'Invalid job definition');
    const rejected = unknownTaskType(parsed.data.target);
    if (rejected) return rejected;
    const job = insertJob(parsed.data);
    publish({ type: 'job.created', job });
    return HttpResponse.json(job, { status: 201 });
  }),

  http.get<{ id: string }>(apiUrl('/jobs/:id'), async ({ params }) => {
    await delay();
    const job = findJob(params.id);
    return job ? HttpResponse.json(job) : error(404, 'Job not found');
  }),

  http.get<{ id: string }>(apiUrl('/jobs/:id/executions'), async ({ params }) => {
    await delay();
    if (!findJob(params.id)) return error(404, 'Job not found');
    return HttpResponse.json(mockDb.executions.get(params.id) ?? []);
  }),

  jobActionHandler('retry'),
  jobActionHandler('pause'),
  jobActionHandler('resume'),
  jobActionHandler('cancel'),

  // --- Schedules -----------------------------------------------------------
  http.get(apiUrl('/schedules'), async () => {
    await delay();
    return HttpResponse.json(listSchedules());
  }),

  // Registered before /schedules/:id so "upcoming" isn't treated as an id.
  http.get(apiUrl('/schedules/upcoming'), async ({ request }) => {
    await delay();
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? 10);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return error(400, 'limit must be an integer between 1 and 100');
    }
    return HttpResponse.json(upcomingExecutions(limit));
  }),

  http.post(apiUrl('/schedules'), async ({ request }) => {
    await delay();
    const parsed = scheduleRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return error(400, parsed.error.issues[0]?.message ?? 'Invalid schedule');
    }
    const rejected = unknownTaskType(parsed.data.jobTemplate.target);
    if (rejected) return rejected;
    try {
      const schedule = createSchedule(parsed.data);
      publish({ type: 'schedule.updated', schedule });
      return HttpResponse.json(schedule, { status: 201 });
    } catch (conflict) {
      if (conflict instanceof ScheduleConflictError) return error(400, conflict.message);
      throw conflict;
    }
  }),

  http.get<{ id: string }>(apiUrl('/schedules/:id'), async ({ params }) => {
    await delay();
    const schedule = findSchedule(params.id);
    return schedule ? HttpResponse.json(schedule) : error(404, 'Schedule not found');
  }),

  http.put<{ id: string }>(apiUrl('/schedules/:id'), async ({ params, request }) => {
    await delay();
    const schedule = findSchedule(params.id);
    if (!schedule) return error(404, 'Schedule not found');
    const parsed = scheduleRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return error(400, parsed.error.issues[0]?.message ?? 'Invalid schedule');
    }
    const rejected = unknownTaskType(parsed.data.jobTemplate.target);
    if (rejected) return rejected;
    try {
      updateSchedule(schedule, parsed.data);
    } catch (conflict) {
      if (conflict instanceof ScheduleConflictError) return error(400, conflict.message);
      throw conflict;
    }
    publish({ type: 'schedule.updated', schedule });
    return HttpResponse.json(schedule);
  }),

  http.delete<{ id: string }>(apiUrl('/schedules/:id'), async ({ params }) => {
    await delay();
    if (!findSchedule(params.id)) return error(404, 'Schedule not found');
    deleteSchedule(params.id);
    publish({ type: 'schedule.deleted', scheduleId: params.id });
    return new HttpResponse(null, { status: 204 });
  }),

  scheduleActionHandler('pause'),
  scheduleActionHandler('resume'),
];
