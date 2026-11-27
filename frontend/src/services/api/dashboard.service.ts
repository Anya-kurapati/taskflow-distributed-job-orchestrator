import { dashboardSummarySchema, jobTrendsSchema } from '@/schemas/dashboard.schema';
import { jobListSchema } from '@/schemas/job.schema';
import type { DashboardSummary, JobTrends, TrendRange } from '@/types/dashboard';
import type { Job } from '@/types/job';

import { apiClient } from './client';

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const { data } = await apiClient.get<unknown>('/dashboard/summary');
    return dashboardSummarySchema.parse(data);
  },

  async getTrends(range: TrendRange): Promise<JobTrends> {
    const { data } = await apiClient.get<unknown>('/dashboard/trends', { params: { range } });
    return jobTrendsSchema.parse(data);
  },

  /** Most recently started jobs, newest first. */
  async getRecentExecutions(limit: number): Promise<Job[]> {
    const { data } = await apiClient.get<unknown>('/dashboard/recent-executions', {
      params: { limit },
    });
    return jobListSchema.parse(data);
  },
};
