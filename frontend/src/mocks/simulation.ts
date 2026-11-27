import type { JobExecution } from '@/types/job';

import { finishExecution, HTTP_ERRORS, iso, mockDb, TASK_ERRORS } from './db';
import { publish } from './events';
import { runDueSchedules } from './schedules';
import { progressMessage } from './taskTypes';

/**
 * Browser-only stand-in for the scheduler and workers: every tick it fires due
 * schedules and moves jobs through their lifecycle (queued → running →
 * completed / retry / failed), publishing the same SSE events a real backend
 * would. Tests don't run it, so their dataset stays static.
 */

const SECOND = 1_000;
const plannedRuns = new Map<string, { endsAt: number; succeeds: boolean }>();
let timer: number | undefined;

export function startSimulation(intervalMs = SECOND) {
  if (timer === undefined) timer = window.setInterval(() => tick(Date.now()), intervalMs);
}

export function tick(now: number) {
  for (const { schedule, job } of runDueSchedules(now)) {
    if (job) publish({ type: 'job.created', job });
    publish({ type: 'schedule.updated', schedule });
  }

  for (const job of mockDb.jobs) {
    const history = mockDb.executions.get(job.id) ?? [];

    if (job.status === 'SCHEDULED' && job.nextRunAt && Date.parse(job.nextRunAt) <= now) {
      job.status = 'QUEUED';
      job.nextRunAt = null;
      job.updatedAt = iso(now);
      publish({ type: 'job.updated', job });
    } else if (job.status === 'PENDING' && Date.parse(job.updatedAt) + 2 * SECOND <= now) {
      job.status = 'QUEUED';
      job.updatedAt = iso(now);
      publish({ type: 'job.updated', job });
    } else if (job.status === 'QUEUED' && Date.parse(job.updatedAt) + 3 * SECOND <= now) {
      job.status = 'RUNNING';
      job.attempts += 1;
      job.startedAt = iso(now);
      job.updatedAt = iso(now);
      const execution: JobExecution = {
        id: `${job.id}-attempt-${job.attempts}`,
        jobId: job.id,
        attempt: job.attempts,
        status: 'RUNNING',
        startedAt: iso(now),
        finishedAt: null,
        durationMs: null,
        workerId: `worker-${1 + Math.floor(Math.random() * 4)}`,
        error: null,
      };
      history.unshift(execution);
      mockDb.executions.set(job.id, history);
      publish({ type: 'job.started', job, execution });
    } else if (job.status === 'RUNNING') {
      const run = history.find((candidate) => candidate.status === 'RUNNING');
      if (!run) continue;
      let plan = plannedRuns.get(run.id);
      if (!plan) {
        plan = {
          endsAt: now + 5 * SECOND + Math.random() * 15 * SECOND,
          succeeds: Math.random() < 0.75,
        };
        plannedRuns.set(run.id, plan);
      }

      if (plan.endsAt > now) {
        // Only tasks that can measure their work report progress.
        const started = Date.parse(run.startedAt);
        const percent = Math.min(99, Math.round(((now - started) / (plan.endsAt - started)) * 100));
        const message =
          job.target.kind === 'TASK' ? progressMessage(job.target.taskType, percent) : null;
        if (message !== null) {
          publish({
            type: 'job.progress',
            jobId: job.id,
            executionId: run.id,
            progress: { percent, message },
          });
        }
        continue;
      }

      plannedRuns.delete(run.id);
      job.updatedAt = iso(now);
      if (plan.succeeds) {
        finishExecution(run, 'SUCCEEDED', now);
        job.status = 'COMPLETED';
        job.completedAt = iso(now);
        job.lastError = null;
        publish({ type: 'job.completed', job });
        continue;
      }

      const errors = job.target.kind === 'HTTP' ? HTTP_ERRORS : TASK_ERRORS;
      const error = errors[Math.floor(Math.random() * errors.length)]!;
      finishExecution(run, 'FAILED', now, error);
      job.lastError = error;
      if (job.attempts <= job.maxRetries) {
        job.status = 'SCHEDULED';
        job.nextRunAt = iso(now + job.retryDelaySeconds * SECOND);
        publish({
          type: 'job.retry_scheduled',
          job,
          error,
          attempt: job.attempts,
          nextRunAt: job.nextRunAt,
        });
      } else {
        job.status = 'FAILED';
        job.completedAt = iso(now);
        publish({ type: 'job.failed', job, error });
      }
    }
  }
}
