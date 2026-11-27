import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildJob } from '@/test/fixtures';
import type { LiveEvent } from '@/types/events';

import { createBatchedInvalidator, notificationForEvent } from './liveEvents';
import { DEFAULT_NOTIFICATION_PREFS } from './notificationPrefs';

afterEach(() => vi.useRealTimers());

describe('createBatchedInvalidator', () => {
  it('collapses a burst of invalidations into one per query key', () => {
    vi.useFakeTimers();
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    const batch = createBatchedInvalidator(queryClient, 500);

    for (let i = 0; i < 50; i += 1) {
      batch.invalidate(['jobs', 'list']);
      batch.invalidate(['dashboard']);
    }
    expect(invalidate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['jobs', 'list'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
  });

  it('drops pending work when disposed', () => {
    vi.useFakeTimers();
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    const batch = createBatchedInvalidator(queryClient, 500);

    batch.invalidate(['jobs', 'list']);
    batch.dispose();
    vi.advanceTimersByTime(1_000);
    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe('notificationForEvent', () => {
  const job = buildJob({ id: 'job-9', name: 'Resize images' });
  const error = { message: 'Out of memory' };
  const now = Date.parse('2026-11-26T12:00:00Z');

  const events: Record<string, LiveEvent> = {
    completed: { type: 'job.completed', job },
    failed: { type: 'job.failed', job, error },
    retry: {
      type: 'job.retry_scheduled',
      job,
      error,
      attempt: 2,
      nextRunAt: '2026-11-26T12:01:30Z',
    },
  };

  it('builds notifications that link to the job', () => {
    expect(notificationForEvent(events.completed!, DEFAULT_NOTIFICATION_PREFS, now)).toMatchObject({
      tone: 'success',
      title: 'Job completed',
      href: '/jobs/job-9',
    });
    expect(notificationForEvent(events.failed!, DEFAULT_NOTIFICATION_PREFS, now)).toMatchObject({
      tone: 'error',
      description: 'Resize images: Out of memory',
    });
    expect(notificationForEvent(events.retry!, DEFAULT_NOTIFICATION_PREFS, now)).toMatchObject({
      tone: 'warning',
      title: 'Attempt 2 failed — retrying',
      description: 'Resize images will retry in 1m 30s. Out of memory',
    });
  });

  it.each([
    ['completed', 'jobCompleted'],
    ['failed', 'jobFailed'],
    ['retry', 'jobRetry'],
  ] as const)('suppresses %s notifications when %s is off', (event, pref) => {
    const prefs = { ...DEFAULT_NOTIFICATION_PREFS, [pref]: false };
    expect(notificationForEvent(events[event]!, prefs, now)).toBeNull();
  });

  it('never notifies for routine events', () => {
    expect(
      notificationForEvent({ type: 'job.updated', job }, DEFAULT_NOTIFICATION_PREFS, now),
    ).toBeNull();
    expect(
      notificationForEvent(
        { type: 'job.progress', jobId: 'job-9', executionId: 'x', progress: { percent: 10 } },
        DEFAULT_NOTIFICATION_PREFS,
        now,
      ),
    ).toBeNull();
  });
});
