import { describe, expect, it } from 'vitest';

import { dashboardService } from '@/services/api';

import { computeTrends, mockDb } from './db';

// These tests call the real service layer (Axios + Zod parsing) against the
// mock API, so they fail if the mocks drift from the frontend's contract.

describe('mock API: dashboard', () => {
  it('returns a summary consistent with the job store', async () => {
    const summary = await dashboardService.getSummary();
    const count = (status: string) => mockDb.jobs.filter((job) => job.status === status).length;

    expect(summary.totalJobs).toBe(mockDb.jobs.length);
    expect(summary.successfulJobs).toBe(count('COMPLETED'));
    expect(summary.failedJobs).toBe(count('FAILED'));
    expect(summary.runningJobs).toBe(count('RUNNING'));
    expect(summary.pendingJobs).toBe(count('PENDING') + count('QUEUED') + count('SCHEDULED'));
    expect(summary.runningJobs).toBeGreaterThan(0);
  });

  it.each([
    ['24h', 'hour', 24],
    ['7d', 'day', 7],
    ['30d', 'day', 30],
  ] as const)('returns %s trends as %i %s buckets', async (range, interval, buckets) => {
    const trends = await dashboardService.getTrends(range);

    expect(trends.interval).toBe(interval);
    expect(trends.points).toHaveLength(buckets);
    const timestamps = trends.points.map((point) => Date.parse(point.timestamp));
    expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
  });

  it('only counts executions that finished inside the range', () => {
    const now = Date.parse('2026-11-26T12:30:00');
    const job = mockDb.jobs[0]!;
    const jobs = [
      {
        ...job,
        status: 'COMPLETED' as const,
        completedAt: new Date(now - 10 * 60_000).toISOString(),
      },
      {
        ...job,
        status: 'FAILED' as const,
        completedAt: new Date(now - 2 * 3_600_000).toISOString(),
      },
      {
        ...job,
        status: 'COMPLETED' as const,
        completedAt: new Date(now - 2 * 86_400_000).toISOString(),
      },
      { ...job, status: 'RUNNING' as const, completedAt: null },
    ];

    const trends = computeTrends(jobs, '24h', now);
    const totals = trends.points.reduce(
      (sum, point) => ({
        completed: sum.completed + point.completed,
        failed: sum.failed + point.failed,
      }),
      { completed: 0, failed: 0 },
    );

    expect(totals).toEqual({ completed: 1, failed: 1 });
    expect(trends.points.at(-1)).toMatchObject({ completed: 1, failed: 0 });
  });

  it('returns recent executions newest first, limited', async () => {
    const jobs = await dashboardService.getRecentExecutions(5);

    expect(jobs).toHaveLength(5);
    expect(jobs.every((job) => job.startedAt)).toBe(true);
    const started = jobs.map((job) => Date.parse(job.startedAt!));
    expect(started).toEqual([...started].sort((a, b) => b - a));
  });
});
