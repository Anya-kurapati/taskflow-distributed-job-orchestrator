import { HTTP_WEBHOOK_TYPE } from '@/constants/jobs';
import type { Schedule, ScheduleTrigger } from '@/types/schedule';
import { nextTriggerTime } from '@/utils/cron';
import type { DashboardSummary, JobTrends, TrendPoint, TrendRange } from '@/types/dashboard';
import type {
  CreateJobRequest,
  ExecutionStatus,
  Job,
  JobError,
  JobExecution,
  JobListParams,
  JobStatus,
  JobTarget,
  Page,
} from '@/types/job';

import { MOCK_TASK_TYPES } from './taskTypes';

/**
 * In-memory stand-in for the backend's job store, used only by the MSW mock
 * API. The functions below document what the real backend is expected to do.
 */

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const iso = (ms: number) => new Date(ms).toISOString();

/** Small seeded PRNG so the mock dataset is identical on every reload. */
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const TASK_ERRORS: JobError[] = [
  {
    message: 'SMTP connection refused by smtp.internal:587',
    code: 'SMTP_UNAVAILABLE',
    details:
      'Error: connect ECONNREFUSED 10.0.4.12:587\n    at EmailTask.send (tasks/email.ts:88)\n    at TaskRunner.execute (worker/runner.ts:142)',
  },
  {
    message: 'Payload validation failed: "recipients" must contain at least 1 item',
    code: 'INVALID_PAYLOAD',
  },
  {
    message: 'Upstream CRM API rate limit exceeded (429 Too Many Requests)',
    code: 'RATE_LIMITED',
    details: 'Retry-After: 120',
  },
  {
    message: 'Worker ran out of memory while processing batch 14/20',
    code: 'OUT_OF_MEMORY',
  },
];

export const HTTP_ERRORS: JobError[] = [
  {
    message: 'Webhook responded with 503 Service Unavailable',
    code: 'HTTP_503',
    details: 'Response body: {"error":"scheduled maintenance","retryAfter":300}',
  },
  { message: 'Connection reset by peer', code: 'ECONNRESET' },
  { message: 'Webhook responded with 401 Unauthorized', code: 'HTTP_401' },
];

const timeoutError = (seconds: number): JobError => ({
  message: `Execution exceeded the ${seconds}s timeout and was terminated`,
  code: 'TIMEOUT',
});

const WEBHOOKS = [
  { name: 'Notify billing service', url: 'https://billing.example.com/hooks/invoice-ready' },
  { name: 'Post deploy summary to chat', url: 'https://chat.example.com/api/webhooks/deploys' },
  { name: 'Refresh partner catalog', url: 'https://partners.example.com/v2/catalog/refresh' },
];

export const mockDb = {
  jobs: [] as Job[],
  executions: new Map<string, JobExecution[]>(),
  schedules: [] as Schedule[],
};

let jobSequence = 1000;

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

type SeedOutcome =
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'RUNNING'
  | 'QUEUED'
  | 'PENDING'
  | 'SCHEDULED'
  | 'RETRY_WAIT'
  | 'PAUSED';

function seed(now: number) {
  const random = mulberry32(20261126);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!;
  const jobs: Job[] = [];
  const executions = new Map<string, JobExecution[]>();

  const addJob = (createdAt: number, outcome: SeedOutcome) => {
    jobSequence += 1;
    const id = `job-${jobSequence}`;
    const isHttp = random() < 0.2;
    const webhook = pick(WEBHOOKS);
    const taskType = pick(MOCK_TASK_TYPES);
    const target: JobTarget = isHttp
      ? {
          kind: 'HTTP',
          method: 'POST',
          url: webhook.url,
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer sk_live_redacted' },
          body: { source: 'taskflow', jobId: id },
        }
      : { kind: 'TASK', taskType: taskType.type, payload: taskType.examplePayload };
    const timeoutSeconds = pick([60, 300, 900]);
    const maxRetries = pick([0, 1, 2, 3, 3, 5]);
    const retryDelaySeconds = pick([10, 30, 60, 300]);
    const errors = isHttp ? HTTP_ERRORS : TASK_ERRORS;

    const job: Job = {
      id,
      name: `${isHttp ? webhook.name : taskType.name} #${jobSequence}`,
      description:
        random() < 0.4 ? `Seeded ${isHttp ? 'webhook' : 'task'} job for the demo dataset.` : null,
      type: isHttp ? HTTP_WEBHOOK_TYPE : taskType.type,
      status: 'QUEUED',
      priority: pick(['LOW', 'MEDIUM', 'MEDIUM', 'HIGH', 'CRITICAL'] as const),
      target,
      timeoutSeconds,
      maxRetries,
      retryDelaySeconds,
      attempts: 0,
      createdAt: iso(createdAt),
      updatedAt: iso(createdAt),
      scheduledAt: null,
      nextRunAt: null,
      startedAt: null,
      completedAt: null,
      lastError: null,
    };
    const history: JobExecution[] = [];
    let clock = createdAt + 1_000 + random() * 20 * SECOND;

    const attempt = (status: ExecutionStatus, error: JobError | null = null) => {
      const duration =
        status === 'TIMED_OUT' ? timeoutSeconds * SECOND : 2 * SECOND + random() * 6 * MINUTE;
      const startedAt = clock;
      const finishedAt = status === 'RUNNING' ? null : startedAt + duration;
      history.push({
        id: `${id}-attempt-${history.length + 1}`,
        jobId: id,
        attempt: history.length + 1,
        status,
        startedAt: iso(startedAt),
        finishedAt: finishedAt === null ? null : iso(finishedAt),
        durationMs: finishedAt === null ? null : Math.round(finishedAt - startedAt),
        workerId: `worker-${1 + Math.floor(random() * 4)}`,
        error,
      });
      job.startedAt = iso(startedAt);
      if (finishedAt !== null) clock = finishedAt + retryDelaySeconds * SECOND;
      return finishedAt ?? startedAt;
    };
    const failure = (): [ExecutionStatus, JobError] =>
      random() < 0.2 ? ['TIMED_OUT', timeoutError(timeoutSeconds)] : ['FAILED', pick(errors)];
    const finish = (status: JobStatus, at: number) => {
      job.status = status;
      job.completedAt = iso(at);
      job.updatedAt = iso(at);
    };

    switch (outcome) {
      case 'COMPLETED': {
        if (maxRetries > 0 && random() < 0.15) attempt(...failure());
        finish('COMPLETED', attempt('SUCCEEDED'));
        break;
      }
      case 'FAILED': {
        let end = clock;
        let lastError: JobError | null = null;
        for (let i = 0; i <= maxRetries; i += 1) {
          const [status, error] = failure();
          end = attempt(status, error);
          lastError = error;
        }
        job.lastError = lastError;
        finish('FAILED', end);
        break;
      }
      case 'CANCELLED': {
        const end = random() < 0.5 ? attempt('CANCELLED') : clock;
        finish('CANCELLED', end);
        break;
      }
      case 'RUNNING': {
        job.status = 'RUNNING';
        job.updatedAt = iso(attempt('RUNNING'));
        break;
      }
      case 'RETRY_WAIT': {
        const [status, error] = failure();
        attempt(status, error);
        job.status = 'SCHEDULED';
        job.lastError = error;
        job.nextRunAt = iso(now + 20 * SECOND + random() * 4 * MINUTE);
        job.updatedAt = iso(now - 30 * SECOND);
        break;
      }
      case 'SCHEDULED':
      case 'PAUSED': {
        const runAt = now + HOUR + random() * 3 * DAY;
        job.status = outcome;
        job.scheduledAt = iso(runAt);
        job.nextRunAt = iso(runAt);
        break;
      }
      case 'QUEUED':
      case 'PENDING':
        job.status = outcome;
        break;
    }

    job.attempts = history.length;
    jobs.push(job);
    executions.set(id, history.reverse()); // newest first
  };

  const finishedOutcome = (failureRate: number): SeedOutcome => {
    const roll = random();
    if (roll < failureRate) return 'FAILED';
    if (roll < failureRate + 0.03) return 'CANCELLED';
    return 'COMPLETED';
  };

  // Older history: a handful of finished jobs per day for the last 30 days.
  for (let day = 1; day < 30; day += 1) {
    const failureRate = 0.05 + 0.05 * Math.abs(Math.sin(day / 3));
    const count = 6 + Math.floor(random() * 9);
    for (let i = 0; i < count; i += 1) {
      addJob(now - day * DAY - random() * DAY, finishedOutcome(failureRate));
    }
  }

  // Last 24h: busier, with a failure spike 5–7 hours ago.
  for (let hour = 1; hour < 24; hour += 1) {
    const failureRate = hour >= 5 && hour <= 7 ? 0.35 : 0.06;
    const count = 1 + Math.floor(random() * 4);
    for (let i = 0; i < count; i += 1) {
      addJob(now - hour * HOUR - random() * HOUR - 15 * MINUTE, finishedOutcome(failureRate));
    }
  }

  // Work in flight right now.
  for (let i = 0; i < 6; i += 1) addJob(now - random() * 8 * MINUTE, 'RUNNING');
  for (let i = 0; i < 3; i += 1) addJob(now - random() * 30 * MINUTE, 'RETRY_WAIT');
  for (let i = 0; i < 4; i += 1) addJob(now - random() * 3 * MINUTE, 'QUEUED');
  for (let i = 0; i < 3; i += 1) addJob(now - random() * MINUTE, 'PENDING');
  for (let i = 0; i < 5; i += 1) addJob(now - random() * 2 * DAY, 'SCHEDULED');
  for (let i = 0; i < 2; i += 1) addJob(now - random() * 2 * DAY, 'PAUSED');

  jobs.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return { jobs, executions };
}

/** A few demo schedules: recurring (active and paused) and one-time (pending and done). */
function seedSchedules(now: number, jobs: Job[]): Schedule[] {
  const template = (target: JobTarget) => ({
    priority: 'MEDIUM' as const,
    target,
    timeoutSeconds: 300,
    maxRetries: 2,
    retryDelaySeconds: 30,
  });
  const task = (taskType: string, payload: Record<string, unknown>): JobTarget => ({
    kind: 'TASK',
    taskType,
    payload,
  });
  const make = (
    id: string,
    name: string,
    trigger: ScheduleTrigger,
    target: JobTarget,
    extra: Partial<Schedule> = {},
  ): Schedule => {
    const status = extra.status ?? 'ACTIVE';
    const next = status === 'ACTIVE' ? nextTriggerTime(trigger, new Date(now)) : null;
    return {
      id,
      name,
      description: null,
      status,
      trigger,
      overlapPolicy: 'SKIP',
      jobTemplate: template(target),
      nextRunAt: next ? next.toISOString() : null,
      lastRunAt: null,
      lastJobId: null,
      lastRunOutcome: null,
      createdAt: iso(now - 14 * DAY),
      updatedAt: iso(now - 2 * DAY),
      ...extra,
    };
  };
  const finished = jobs.find((job) => job.status === 'COMPLETED' && job.target.kind === 'TASK');

  return [
    make(
      'sch-warm-cache',
      'Warm search cache',
      { type: 'CRON', expression: '*/2 * * * *', timezone: 'UTC' },
      task('cache.warm', { index: 'products', topQueries: 500 }),
      { description: 'Keeps popular search results hot.' },
    ),
    make(
      'sch-nightly-report',
      'Nightly usage report',
      { type: 'CRON', expression: '0 2 * * *', timezone: 'America/New_York' },
      task('report.generate', { report: 'daily-usage', format: 'pdf' }),
    ),
    make(
      'sch-monthly-invoices',
      'Monthly invoices',
      { type: 'CRON', expression: '0 6 1 * *', timezone: 'Europe/London' },
      task('billing.invoice', { dryRun: false }),
      { status: 'PAUSED', description: 'Paused while billing migrates to the new provider.' },
    ),
    make(
      'sch-partner-refresh',
      'Refresh partner catalog',
      { type: 'ONCE', runAt: iso(now + 3 * HOUR) },
      {
        kind: 'HTTP',
        method: 'POST',
        url: 'https://partners.example.com/v2/catalog/refresh',
        headers: { 'Content-Type': 'application/json' },
        body: { full: true },
      },
    ),
    make(
      'sch-crm-backfill',
      'Backfill CRM contacts',
      { type: 'ONCE', runAt: iso(now - DAY) },
      task('data.sync', { source: 'crm', destination: 'warehouse', entity: 'contacts' }),
      {
        status: 'COMPLETED',
        lastRunAt: iso(now - DAY),
        lastJobId: finished?.id ?? null,
        lastRunOutcome: 'CREATED',
      },
    ),
  ];
}

/** Restores the seed data — used between tests. */
export function resetMockDb(now: number = Date.now()) {
  jobSequence = 1000;
  const seeded = seed(now);
  mockDb.jobs = seeded.jobs;
  mockDb.executions = seeded.executions;
  mockDb.schedules = seedSchedules(now, seeded.jobs);
}

// ---------------------------------------------------------------------------
// Jobs API behaviour
// ---------------------------------------------------------------------------

export const findJob = (id: string) => mockDb.jobs.find((job) => job.id === id);

export function listJobs(
  params: Required<Pick<JobListParams, 'sort' | 'page' | 'pageSize'>> & JobListParams,
): Page<Job> {
  const search = params.search?.trim().toLowerCase();
  const filtered = mockDb.jobs.filter(
    (job) =>
      (!search || job.name.toLowerCase().includes(search)) &&
      (!params.status || job.status === params.status) &&
      (!params.type || job.type === params.type),
  );
  const direction = params.sort === 'createdAt:asc' ? 1 : -1;
  filtered.sort((a, b) => direction * (Date.parse(a.createdAt) - Date.parse(b.createdAt)));

  const start = (params.page - 1) * params.pageSize;
  return {
    items: filtered.slice(start, start + params.pageSize),
    page: params.page,
    pageSize: params.pageSize,
    totalItems: filtered.length,
    totalPages: Math.ceil(filtered.length / params.pageSize),
  };
}

export function insertJob(
  request: CreateJobRequest,
  now: number = Date.now(),
  { scheduleId }: { scheduleId?: string } = {},
): Job {
  const scheduledAt = request.scheduledAt ? Date.parse(request.scheduledAt) : null;
  const isScheduled = scheduledAt !== null && scheduledAt > now;
  const job: Job = {
    id: `job-${crypto.randomUUID().slice(0, 8)}`,
    name: request.name,
    description: request.description ?? null,
    type: request.target.kind === 'TASK' ? request.target.taskType : HTTP_WEBHOOK_TYPE,
    status: isScheduled ? 'SCHEDULED' : 'QUEUED',
    priority: request.priority,
    target: request.target,
    timeoutSeconds: request.timeoutSeconds,
    maxRetries: request.maxRetries,
    retryDelaySeconds: request.retryDelaySeconds,
    attempts: 0,
    createdAt: iso(now),
    updatedAt: iso(now),
    scheduledAt: request.scheduledAt ?? null,
    nextRunAt: isScheduled ? iso(scheduledAt) : null,
    startedAt: null,
    completedAt: null,
    lastError: null,
    scheduleId: scheduleId ?? null,
  };
  mockDb.jobs.unshift(job);
  mockDb.executions.set(job.id, []);
  return job;
}

/** Applies a lifecycle action. Callers must check `isActionAllowed` first. */
export function applyAction(
  job: Job,
  action: 'retry' | 'pause' | 'resume' | 'cancel',
  now = Date.now(),
) {
  job.updatedAt = iso(now);
  switch (action) {
    case 'retry':
      // A manual retry queues one more attempt; lastError stays until it succeeds.
      job.status = 'QUEUED';
      job.completedAt = null;
      job.nextRunAt = null;
      break;
    case 'pause':
      job.status = 'PAUSED';
      break;
    case 'resume': {
      const due = job.nextRunAt ? Date.parse(job.nextRunAt) : null;
      job.status = due !== null && due > now ? 'SCHEDULED' : 'QUEUED';
      if (job.status === 'QUEUED') job.nextRunAt = null;
      break;
    }
    case 'cancel': {
      const running = mockDb.executions.get(job.id)?.find((run) => run.status === 'RUNNING');
      if (running) finishExecution(running, 'CANCELLED', now);
      job.status = 'CANCELLED';
      job.completedAt = iso(now);
      job.nextRunAt = null;
      break;
    }
  }
  return job;
}

export function finishExecution(
  run: JobExecution,
  status: ExecutionStatus,
  now: number,
  error?: JobError,
) {
  run.status = status;
  run.finishedAt = iso(now);
  run.durationMs = Math.max(0, now - Date.parse(run.startedAt));
  run.error = error ?? null;
}

// ---------------------------------------------------------------------------
// Dashboard aggregations — the real backend should compute these.
// ---------------------------------------------------------------------------

export function computeSummary(jobs: Job[], now: number = Date.now()): DashboardSummary {
  const countOf = (...statuses: JobStatus[]) =>
    jobs.filter((job) => statuses.includes(job.status)).length;

  return {
    totalJobs: jobs.length,
    successfulJobs: countOf('COMPLETED'),
    failedJobs: countOf('FAILED'),
    runningJobs: countOf('RUNNING'),
    pendingJobs: countOf('PENDING', 'QUEUED', 'SCHEDULED'),
    generatedAt: new Date(now).toISOString(),
  };
}

const TREND_BUCKETS: Record<TrendRange, { interval: 'hour' | 'day'; count: number }> = {
  '24h': { interval: 'hour', count: 24 },
  '7d': { interval: 'day', count: 7 },
  '30d': { interval: 'day', count: 30 },
};

/**
 * Buckets finished jobs (COMPLETED / FAILED, by completion time) into hourly
 * or daily intervals. The last bucket is the current, partial one.
 */
export function computeTrends(jobs: Job[], range: TrendRange, now: number = Date.now()): JobTrends {
  const { interval, count } = TREND_BUCKETS[range];
  const bucketStart = new Date(now);
  if (interval === 'hour') bucketStart.setMinutes(0, 0, 0);
  else bucketStart.setHours(0, 0, 0, 0);

  const step = (date: Date, by: number) => {
    const next = new Date(date);
    if (interval === 'hour') next.setHours(next.getHours() + by);
    else next.setDate(next.getDate() + by); // calendar days, DST-safe
    return next;
  };

  const starts = Array.from({ length: count }, (_, i) => step(bucketStart, i - (count - 1)));
  const end = step(bucketStart, 1).getTime();
  const points: TrendPoint[] = starts.map((start) => ({
    timestamp: start.toISOString(),
    completed: 0,
    failed: 0,
  }));

  for (const job of jobs) {
    if ((job.status !== 'COMPLETED' && job.status !== 'FAILED') || !job.completedAt) continue;
    const time = Date.parse(job.completedAt);
    if (time < starts[0]!.getTime() || time >= end) continue;
    let index = starts.length - 1;
    while (index > 0 && starts[index]!.getTime() > time) index -= 1;
    const point = points[index]!;
    if (job.status === 'COMPLETED') point.completed += 1;
    else point.failed += 1;
  }

  return { range, interval, points };
}

export function recentExecutions(jobs: Job[], limit: number): Job[] {
  return jobs
    .filter((job) => job.startedAt)
    .sort((a, b) => Date.parse(b.startedAt!) - Date.parse(a.startedAt!))
    .slice(0, limit);
}

resetMockDb();
