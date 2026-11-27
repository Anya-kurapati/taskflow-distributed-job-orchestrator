import type { z } from 'zod';

import type {
  dashboardSummarySchema,
  jobTrendsSchema,
  trendPointSchema,
  trendRangeSchema,
} from '@/schemas/dashboard.schema';

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
export type TrendRange = z.infer<typeof trendRangeSchema>;
export type TrendPoint = z.infer<typeof trendPointSchema>;
export type JobTrends = z.infer<typeof jobTrendsSchema>;
