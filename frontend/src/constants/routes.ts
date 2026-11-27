import { generatePath } from 'react-router';

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  JOBS: '/jobs',
  JOB_CREATE: '/jobs/create',
  JOB_DETAILS: '/jobs/:id',
  SCHEDULES: '/schedules',
  SCHEDULE_CREATE: '/schedules/new',
  SCHEDULE_EDIT: '/schedules/:id/edit',
  SETTINGS: '/settings',
} as const;

export const jobDetailsPath = (id: string): string => generatePath(ROUTES.JOB_DETAILS, { id });

export const scheduleEditPath = (id: string): string => generatePath(ROUTES.SCHEDULE_EDIT, { id });
