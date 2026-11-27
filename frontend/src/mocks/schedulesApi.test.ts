import { describe, expect, it } from 'vitest';

import { schedulesService } from '@/services/api';
import type { ScheduleRequest } from '@/types/schedule';

import { findJob, mockDb } from './db';
import { findSchedule, runDueSchedules } from './schedules';

// API tests go through the real service layer (Axios + Zod) against the mock
// API; scheduler tests call the mock scheduler directly with a fixed clock.

const HOUR = 3_600_000;

const request = (overrides: Partial<ScheduleRequest> = {}): ScheduleRequest => ({
  name: 'Hourly sync',
  description: null,
  trigger: { type: 'CRON', expression: '0 * * * *', timezone: 'UTC' },
  overlapPolicy: 'SKIP',
  jobTemplate: {
    priority: 'MEDIUM',
    target: { kind: 'TASK', taskType: 'data.sync', payload: { entity: 'contacts' } },
    timeoutSeconds: 300,
    maxRetries: 1,
    retryDelaySeconds: 30,
  },
  ...overrides,
});

const schedule = (id: string) => findSchedule(id)!;

describe('mock API: schedules', () => {
  it('creates a recurring schedule with its next run computed', async () => {
    const created = await schedulesService.create(request());

    expect(created.status).toBe('ACTIVE');
    const next = new Date(created.nextRunAt!);
    expect(next.getTime()).toBeGreaterThan(Date.now());
    expect(next.getUTCMinutes()).toBe(0);
    expect(await schedulesService.list()).toContainEqual(created);
  });

  it('rejects invalid cron expressions, past one-time runs and unknown task types', async () => {
    await expect(
      schedulesService.create(
        request({ trigger: { type: 'CRON', expression: '0 0 31 2 *', timezone: 'UTC' } }),
      ),
    ).rejects.toMatchObject({ status: 400, message: 'This expression never matches a date' });

    await expect(
      schedulesService.create(
        request({ trigger: { type: 'ONCE', runAt: new Date(Date.now() - HOUR).toISOString() } }),
      ),
    ).rejects.toMatchObject({ status: 400, message: 'The run time must be in the future' });

    await expect(
      schedulesService.create(
        request({
          jobTemplate: {
            ...request().jobTemplate,
            target: { kind: 'TASK', taskType: 'shell.exec', payload: {} },
          },
        }),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('lists upcoming executions across active schedules only, soonest first', async () => {
    const upcoming = await schedulesService.upcoming(10);

    expect(upcoming).toHaveLength(10);
    const times = upcoming.map((run) => Date.parse(run.runAt));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    const names = new Set(upcoming.map((run) => run.scheduleName));
    expect(names).not.toContain('Monthly invoices'); // paused
    expect(names).not.toContain('Backfill CRM contacts'); // completed
  });

  it('pauses and resumes, rejecting invalid transitions', async () => {
    const paused = await schedulesService.runAction('sch-warm-cache', 'pause');
    expect(paused).toMatchObject({ status: 'PAUSED', nextRunAt: null });
    await expect(schedulesService.runAction('sch-warm-cache', 'pause')).rejects.toMatchObject({
      status: 409,
    });

    const resumed = await schedulesService.runAction('sch-warm-cache', 'resume');
    expect(resumed.status).toBe('ACTIVE');
    expect(Date.parse(resumed.nextRunAt!)).toBeGreaterThan(Date.now());

    await expect(schedulesService.runAction('sch-crm-backfill', 'resume')).rejects.toMatchObject({
      status: 409,
    });
  });

  it("won't resume a one-time schedule whose time has passed", async () => {
    await schedulesService.runAction('sch-partner-refresh', 'pause');
    const trigger = schedule('sch-partner-refresh').trigger;
    if (trigger.type === 'ONCE') trigger.runAt = new Date(Date.now() - HOUR).toISOString();

    await expect(schedulesService.runAction('sch-partner-refresh', 'resume')).rejects.toMatchObject(
      {
        status: 409,
        message: 'Its run time has passed — edit the schedule to choose a new time',
      },
    );
  });

  it('edits a schedule and recomputes its next run; re-activates a completed one-time schedule', async () => {
    const updated = await schedulesService.update(
      'sch-nightly-report',
      request({
        name: 'Morning report',
        trigger: { type: 'CRON', expression: '0 7 * * *', timezone: 'UTC' },
      }),
    );
    expect(updated.name).toBe('Morning report');
    expect(new Date(updated.nextRunAt!).getUTCHours()).toBe(7);

    const runAt = new Date(Date.now() + 2 * HOUR).toISOString();
    const reactivated = await schedulesService.update(
      'sch-crm-backfill',
      request({ trigger: { type: 'ONCE', runAt } }),
    );
    expect(reactivated).toMatchObject({ status: 'ACTIVE', nextRunAt: runAt });
  });

  it('deletes a schedule', async () => {
    await schedulesService.remove('sch-nightly-report');
    await expect(schedulesService.getById('sch-nightly-report')).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('mock scheduler', () => {
  // Seeded schedules are relative to the real clock, so the scheduler runs on it too.
  const now = Date.now();
  const makeDue = (id: string, at = now - 1_000) => {
    schedule(id).nextRunAt = new Date(at).toISOString();
  };

  it('fires due schedules, creating a job tagged with the schedule', () => {
    makeDue('sch-warm-cache');
    const [run] = runDueSchedules(now);

    expect(run!.job).toMatchObject({
      name: 'Warm search cache',
      status: 'QUEUED',
      scheduleId: 'sch-warm-cache',
    });
    expect(schedule('sch-warm-cache')).toMatchObject({
      lastJobId: run!.job!.id,
      lastRunOutcome: 'CREATED',
    });
    // */2 → the next even minute strictly after now.
    const next = new Date(schedule('sch-warm-cache').nextRunAt!);
    expect(next.getTime()).toBeGreaterThan(now);
    expect(next.getTime() - now).toBeLessThanOrEqual(2 * 60_000);
    expect(next.getUTCMinutes() % 2).toBe(0);
    expect(runDueSchedules(now).map((r) => r.schedule.id)).not.toContain('sch-warm-cache');
  });

  it("doesn't backfill missed runs after downtime", () => {
    makeDue('sch-warm-cache', now - 3 * HOUR); // ~90 runs missed
    const jobsBefore = mockDb.jobs.filter((job) => job.scheduleId === 'sch-warm-cache').length;

    expect(runDueSchedules(now).filter((r) => r.schedule.id === 'sch-warm-cache')).toHaveLength(1);
    expect(mockDb.jobs.filter((job) => job.scheduleId === 'sch-warm-cache')).toHaveLength(
      jobsBefore + 1,
    );
    expect(Date.parse(schedule('sch-warm-cache').nextRunAt!)).toBeGreaterThan(now);
  });

  it('skips a run while the previous job is still active (SKIP policy)', () => {
    makeDue('sch-warm-cache');
    const first = runDueSchedules(now)[0]!.job!;
    expect(findJob(first.id)!.status).toBe('QUEUED');

    makeDue('sch-warm-cache');
    const [second] = runDueSchedules(now + 60_000);
    expect(second!.job).toBeNull();
    expect(schedule('sch-warm-cache')).toMatchObject({
      lastRunOutcome: 'SKIPPED',
      lastJobId: first.id,
    });
  });

  it('allows overlapping jobs with the ALLOW policy', () => {
    schedule('sch-warm-cache').overlapPolicy = 'ALLOW';
    makeDue('sch-warm-cache');
    runDueSchedules(now);
    makeDue('sch-warm-cache');

    expect(runDueSchedules(now + 60_000)[0]!.job).not.toBeNull();
  });

  it('completes one-time schedules after they fire and ignores paused ones', () => {
    makeDue('sch-partner-refresh');
    makeDue('sch-monthly-invoices'); // paused

    const runs = runDueSchedules(now).filter((run) => run.schedule.id.startsWith('sch-'));
    const ids = runs.map((run) => run.schedule.id);
    expect(ids).toContain('sch-partner-refresh');
    expect(ids).not.toContain('sch-monthly-invoices');
    expect(schedule('sch-partner-refresh')).toMatchObject({ status: 'COMPLETED', nextRunAt: null });
    expect(runs.find((run) => run.schedule.id === 'sch-partner-refresh')!.job!.type).toBe(
      'http.webhook',
    );
  });
});
