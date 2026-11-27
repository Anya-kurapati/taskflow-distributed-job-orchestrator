import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';

import { ROUTES } from '@/constants/routes';
import { PageLoader } from '@/components/common/PageLoader';
import { AppLayout } from '@/layouts/AppLayout';
import { RouteErrorPage } from '@/pages/RouteErrorPage';
import type { RouteHandle } from '@/types/route';

const shortId = (id = '') => (id.length > 12 ? `${id.slice(0, 8)}…` : id);

// Pages are lazy-loaded so heavy dependencies (e.g. Recharts on the dashboard)
// are only downloaded when the route is visited. `handle.crumb` drives the
// header breadcrumbs and the document title.
export const routes: RouteObject[] = [
  {
    path: ROUTES.HOME,
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    // Shown while the first (lazy) page loads, instead of a blank screen.
    hydrateFallbackElement: <PageLoader />,
    children: [
      {
        // Pathless route so page errors render inside the shell.
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <Navigate to={ROUTES.DASHBOARD} replace /> },
          {
            path: ROUTES.DASHBOARD,
            handle: { crumb: 'Dashboard' } satisfies RouteHandle,
            lazy: () =>
              import('@/pages/DashboardPage').then((m) => ({ Component: m.DashboardPage })),
          },
          {
            path: ROUTES.JOBS,
            handle: { crumb: 'Jobs' } satisfies RouteHandle,
            children: [
              {
                index: true,
                lazy: () => import('@/pages/JobsPage').then((m) => ({ Component: m.JobsPage })),
              },
              {
                path: ROUTES.JOB_CREATE,
                handle: { crumb: 'Create job' } satisfies RouteHandle,
                lazy: () =>
                  import('@/pages/CreateJobPage').then((m) => ({ Component: m.CreateJobPage })),
              },
              {
                path: ROUTES.JOB_DETAILS,
                handle: { crumb: (params) => `Job ${shortId(params.id)}` } satisfies RouteHandle,
                lazy: () =>
                  import('@/pages/JobDetailsPage').then((m) => ({ Component: m.JobDetailsPage })),
              },
            ],
          },
          {
            path: ROUTES.SCHEDULES,
            handle: { crumb: 'Scheduled jobs' } satisfies RouteHandle,
            children: [
              {
                index: true,
                lazy: () =>
                  import('@/pages/SchedulesPage').then((m) => ({ Component: m.SchedulesPage })),
              },
              {
                path: ROUTES.SCHEDULE_CREATE,
                handle: { crumb: 'New schedule' } satisfies RouteHandle,
                lazy: () =>
                  import('@/pages/ScheduleFormPage').then((m) => ({
                    Component: m.CreateSchedulePage,
                  })),
              },
              {
                path: ROUTES.SCHEDULE_EDIT,
                handle: { crumb: 'Edit schedule' } satisfies RouteHandle,
                lazy: () =>
                  import('@/pages/ScheduleFormPage').then((m) => ({
                    Component: m.EditSchedulePage,
                  })),
              },
            ],
          },
          {
            path: ROUTES.SETTINGS,
            handle: { crumb: 'Settings' } satisfies RouteHandle,
            lazy: () => import('@/pages/SettingsPage').then((m) => ({ Component: m.SettingsPage })),
          },
          {
            path: '*',
            handle: { crumb: 'Not found' } satisfies RouteHandle,
            lazy: () => import('@/pages/NotFoundPage').then((m) => ({ Component: m.NotFoundPage })),
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
