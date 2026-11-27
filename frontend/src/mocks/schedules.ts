import type { Job } from '@/types/job';
import type { Schedule, ScheduleRequest, UpcomingExecution } from '@/types/schedule';
import { nextTriggerTime, upcomingTriggerTimes } from '@/utils/cron';
import { isJobActive } from '@/utils/jobActions';

import { findJob, insertJob, iso, mockDb } from './db';

/**
 * Mock scheduler. This is the reference behaviour for the real backend:
 *
 * - A schedule fires when `now >= nextRunAt` and it is ACTIVE.
 * - Firing creates a job from the template (tagged with `scheduleId`), unless
 *   the overlap policy is SKIP and the previous job is still waiting/running —
 *   then the run is recorded as SKIPPED.
 * - No backfill: after downtime, an overdue schedule fires ONCE and the next
 *   run is computed strictly after "now", so missed runs aren't replayed.
 * - ONE-TIME schedules become COMPLETED after firing.
 * - Pausing clears `nextRunAt`; resuming recomputes it from now. A one-time
 *   schedule whose time has passed can't be resumed — it must be edited.
 * - Editing recomputes `nextRunAt` (and reactivates a completed one-time
 *   schedule given a new future time). Deleting never affects created jobs.
 */

export class ScheduleConflictError extends Error {}

export const findSchedule = (id: string) => mockDb.schedules.find((s) => s.id === id);

export const listSchedules = () =>
  [...mockDb.schedules].sort((a, b) => a.name.localeCompare(b.name));

const computeNextRun = (schedule: Pick<Schedule, 'trigger'>, now: number) =>
  nextTriggerTime(schedule.trigger, new Date(now))?.toISOString() ?? null;

export function createSchedule(request: ScheduleRequest, now = Date.now()): Schedule {
  if (request.trigger.type === 'ONCE' && Date.parse(request.trigger.runAt) <= now) {
    throw new ScheduleConflictError('The run time must be in the future');
  }
  const schedule: Schedule = {
    id: `sch-${crypto.randomUUID().slice(0, 8)}`,
    name: request.name,
    description: request.description ?? null,
    status: 'ACTIVE',
    trigger: request.trigger,
    overlapPolicy: request.overlapPolicy,
    jobTemplate: request.jobTemplate,
    nextRunAt: computeNextRun(request, now),
    lastRunAt: null,
    lastJobId: null,
    lastRunOutcome: null,
    createdAt: iso(now),
    updatedAt: iso(now),
  };
  mockDb.schedules.push(schedule);
  return schedule;
}

export function updateSchedule(schedule: Schedule, request: ScheduleRequest, now = Date.now()) {
  const nextRunAt = computeNextRun(request, now);
  if (request.trigger.type === 'ONCE' && !nextRunAt && schedule.status !== 'COMPLETED') {
    throw new ScheduleConflictError('The run time must be in the future');
  }
  Object.assign(schedule, {
    name: request.name,
    description: request.description ?? null,
    trigger: request.trigger,
    overlapPolicy: request.overlapPolicy,
    jobTemplate: request.jobTemplate,
    updatedAt: iso(now),
  });
  if (schedule.status === 'COMPLETED' && nextRunAt) schedule.status = 'ACTIVE';
  schedule.nextRunAt = schedule.status === 'ACTIVE' ? nextRunAt : null;
  return schedule;
}

export function deleteSchedule(id: string) {
  mockDb.schedules = mockDb.schedules.filter((schedule) => schedule.id !== id);
}

export function pauseSchedule(schedule: Schedule, now = Date.now()) {
  if (schedule.status !== 'ACTIVE') {
    throw new ScheduleConflictError(`A ${schedule.status.toLowerCase()} schedule cannot be paused`);
  }
  schedule.status = 'PAUSED';
  schedule.nextRunAt = null;
  schedule.updatedAt = iso(now);
  return schedule;
}

export function resumeSchedule(schedule: Schedule, now = Date.now()) {
  if (schedule.status !== 'PAUSED') {
    throw new ScheduleConflictError(
      `A ${schedule.status.toLowerCase()} schedule cannot be resumed`,
    );
  }
  const nextRunAt = computeNextRun(schedule, now);
  if (!nextRunAt) {
    throw new ScheduleConflictError(
      'Its run time has passed — edit the schedule to choose a new time',
    );
  }
  schedule.status = 'ACTIVE';
  schedule.nextRunAt = nextRunAt;
  schedule.updatedAt = iso(now);
  return schedule;
}

/** Next fire times across active schedules, soonest first. */
export function upcomingExecutions(limit: number, now = Date.now()): UpcomingExecution[] {
  return mockDb.schedules
    .filter((schedule) => schedule.status === 'ACTIVE')
    .flatMap((schedule) =>
      upcomingTriggerTimes(schedule.trigger, limit, new Date(now)).map((runAt) => ({
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        runAt: runAt.toISOString(),
      })),
    )
    .sort((a, b) => Date.parse(a.runAt) - Date.parse(b.runAt))
    .slice(0, limit);
}

export interface ScheduleRun {
  schedule: Schedule;
  /** The job created, or null when the run was skipped. */
  job: Job | null;
}

/** Fires every due schedule. Returns what happened, for event publishing. */
export function runDueSchedules(now = Date.now()): ScheduleRun[] {
  const runs: ScheduleRun[] = [];

  for (const schedule of mockDb.schedules) {
    if (schedule.status !== 'ACTIVE' || !schedule.nextRunAt) continue;
    if (Date.parse(schedule.nextRunAt) > now) continue;

    const previous = schedule.lastJobId ? findJob(schedule.lastJobId) : undefined;
    const skip =
      schedule.overlapPolicy === 'SKIP' && previous !== undefined && isJobActive(previous.status);

    const job = skip
      ? null
      : insertJob(
          {
            name: schedule.name,
            description: schedule.description,
            scheduledAt: null,
            ...schedule.jobTemplate,
          },
          now,
          { scheduleId: schedule.id },
        );

    schedule.lastRunAt = iso(now);
    schedule.lastRunOutcome = skip ? 'SKIPPED' : 'CREATED';
    if (job) schedule.lastJobId = job.id;
    if (schedule.trigger.type === 'ONCE') {
      schedule.status = 'COMPLETED';
      schedule.nextRunAt = null;
    } else {
      // Strictly after now: overdue runs collapse into this one (no backfill).
      schedule.nextRunAt = computeNextRun(schedule, now);
    }
    schedule.updatedAt = iso(now);
    runs.push({ schedule, job });
  }

  return runs;
}
