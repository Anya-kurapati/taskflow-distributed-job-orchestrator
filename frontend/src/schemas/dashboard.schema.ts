import { z } from 'zod';

import { TREND_RANGES } from '@/constants/dashboard';

/**
 * Dashboard API contract (provisional — mirrors docs/api-contract in the README).
 * All metrics are computed server-side; the frontend only displays them.
 */
const count = z.number().int().nonnegative();

/** GET /dashboard/summary */
export const dashboardSummarySchema = z.object({
  totalJobs: count,
  /** Jobs that finished with status COMPLETED. */
  successfulJobs: count,
  failedJobs: count,
  runningJobs: count,
  /** Jobs waiting to run (PENDING, QUEUED or SCHEDULED). */
  pendingJobs: count,
  generatedAt: z.string(),
});

export const trendRangeSchema = z.enum(TREND_RANGES);

export const trendPointSchema = z.object({
  /** Start of the bucket (ISO 8601). */
  timestamp: z.string(),
  completed: count,
  failed: count,
});

/** GET /dashboard/trends?range=24h|7d|30d */
export const jobTrendsSchema = z.object({
  range: trendRangeSchema,
  interval: z.enum(['hour', 'day']),
  points: z.array(trendPointSchema),
});
