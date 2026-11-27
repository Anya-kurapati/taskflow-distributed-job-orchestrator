import {
  scheduleListSchema,
  scheduleSchema,
  upcomingExecutionListSchema,
} from '@/schemas/schedule.schema';
import type {
  Schedule,
  ScheduleAction,
  ScheduleRequest,
  UpcomingExecution,
} from '@/types/schedule';

import { apiClient } from './client';

const schedulePath = (id: string) => `/schedules/${encodeURIComponent(id)}`;

export const schedulesService = {
  async list(): Promise<Schedule[]> {
    const { data } = await apiClient.get<unknown>('/schedules');
    return scheduleListSchema.parse(data);
  },

  async getById(id: string): Promise<Schedule> {
    const { data } = await apiClient.get<unknown>(schedulePath(id));
    return scheduleSchema.parse(data);
  },

  async create(request: ScheduleRequest): Promise<Schedule> {
    const { data } = await apiClient.post<unknown>('/schedules', request);
    return scheduleSchema.parse(data);
  },

  async update(id: string, request: ScheduleRequest): Promise<Schedule> {
    const { data } = await apiClient.put<unknown>(schedulePath(id), request);
    return scheduleSchema.parse(data);
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(schedulePath(id));
  },

  async runAction(id: string, action: ScheduleAction): Promise<Schedule> {
    const { data } = await apiClient.post<unknown>(`${schedulePath(id)}/${action}`);
    return scheduleSchema.parse(data);
  },

  /** Next fire times across all active schedules, soonest first. */
  async upcoming(limit: number): Promise<UpcomingExecution[]> {
    const { data } = await apiClient.get<unknown>('/schedules/upcoming', { params: { limit } });
    return upcomingExecutionListSchema.parse(data);
  },
};
