import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LiveEvent } from '@/types/events';

import { findJob, insertJob, mockDb } from './db';
import { subscribe } from './events';
import { tick } from './simulation';

const SECOND = 1_000;

function recordEvents() {
  const events: LiveEvent[] = [];
  const unsubscribe = subscribe((event) => events.push(event));
  return { events, unsubscribe, types: () => events.map((event) => event.type) };
}

/** A fresh queued job, plus the mock's other jobs parked so only this one moves. */
function isolatedJob(now: number, kind: 'TASK' | 'HTTP' = 'TASK', maxRetries = 1) {
  for (const job of mockDb.jobs) job.status = 'COMPLETED';
  for (const schedule of mockDb.schedules) schedule.status = 'PAUSED';
  return insertJob(
    {
      name: 'Sim job',
      priority: 'MEDIUM',
      target:
        kind === 'TASK'
          ? { kind: 'TASK', taskType: 'data.sync', payload: {} }
          : { kind: 'HTTP', method: 'POST', url: 'https://example.com', headers: {} },
      scheduledAt: null,
      timeoutSeconds: 60,
      maxRetries,
      retryDelaySeconds: 10,
    },
    now - 10 * SECOND,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('mock simulation', () => {
  it('starts a queued job, reports progress, then completes it', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // succeeds
    const now = Date.now();
    const job = isolatedJob(now);
    const { events, types, unsubscribe } = recordEvents();

    tick(now); // QUEUED → RUNNING
    tick(now + SECOND); // plans the run, reports progress
    tick(now + 60 * SECOND); // finishes
    unsubscribe();

    expect(types()).toEqual(['job.started', 'job.progress', 'job.completed']);
    const progress = events[1] as Extract<LiveEvent, { type: 'job.progress' }>;
    expect(progress.progress.message).toMatch(/Synced .* of 8,400 records/);
    expect(findJob(job.id)).toMatchObject({ status: 'COMPLETED', attempts: 1 });
    expect(mockDb.executions.get(job.id)![0]!.status).toBe('SUCCEEDED');
  });

  it("doesn't report progress for tasks that can't measure it (webhooks)", () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const now = Date.now();
    isolatedJob(now, 'HTTP');
    const { types, unsubscribe } = recordEvents();

    tick(now);
    tick(now + SECOND);
    unsubscribe();

    expect(types()).toEqual(['job.started']);
  });

  it('schedules a retry after a failed attempt, then fails for good', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9); // fails
    const now = Date.now();
    const job = isolatedJob(now, 'TASK', 1);
    const { types, unsubscribe } = recordEvents();

    tick(now); // start attempt 1
    tick(now + SECOND);
    tick(now + 60 * SECOND); // attempt 1 fails → retry in 10s
    expect(findJob(job.id)).toMatchObject({ status: 'SCHEDULED', attempts: 1 });

    tick(now + 71 * SECOND); // retry due → queued
    tick(now + 75 * SECOND); // attempt 2 starts
    tick(now + 76 * SECOND);
    tick(now + 200 * SECOND); // attempt 2 fails, no retries left
    unsubscribe();

    expect(types().filter((type) => type !== 'job.progress')).toEqual([
      'job.started',
      'job.retry_scheduled',
      'job.updated',
      'job.started',
      'job.failed',
    ]);
    expect(findJob(job.id)).toMatchObject({ status: 'FAILED', attempts: 2 });
  });

  it('fires due schedules and announces the created job', () => {
    const now = Date.now();
    const schedule = mockDb.schedules.find((candidate) => candidate.id === 'sch-warm-cache')!;
    schedule.nextRunAt = new Date(now - SECOND).toISOString();
    const { events, unsubscribe } = recordEvents();

    tick(now);
    unsubscribe();

    const created = events.find((event) => event.type === 'job.created');
    expect(created && created.job.scheduleId).toBe('sch-warm-cache');
    expect(events.some((event) => event.type === 'schedule.updated')).toBe(true);
  });
});
