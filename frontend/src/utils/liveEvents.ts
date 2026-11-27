import type { QueryClient, QueryKey } from '@tanstack/react-query';

import { jobDetailsPath } from '@/constants/routes';
import { queryKeys } from '@/constants/queryKeys';
import type { ToastInput } from '@/context/toast-context';
import type { LiveEvent } from '@/types/events';
import { formatDuration } from '@/utils/format';
import type { NotificationPrefs } from '@/utils/notificationPrefs';

/**
 * Collects query invalidations and flushes them together, so a burst of events
 * (e.g. dozens of jobs finishing at once) refetches each list once, not dozens
 * of times. Detail data is written straight into the cache, not refetched.
 */
export function createBatchedInvalidator(queryClient: QueryClient, delayMs = 750) {
  const pending = new Map<string, QueryKey>();
  let timer: number | undefined;

  const flush = () => {
    timer = undefined;
    const keys = [...pending.values()];
    pending.clear();
    keys.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }));
  };

  return {
    invalidate: (queryKey: QueryKey) => {
      pending.set(JSON.stringify(queryKey), queryKey);
      timer ??= window.setTimeout(flush, delayMs);
    },
    dispose: () => {
      window.clearTimeout(timer);
      pending.clear();
    },
  };
}

type Invalidate = (queryKey: QueryKey) => void;

/** Applies a live event to the TanStack Query cache. */
export function applyLiveEvent(queryClient: QueryClient, event: LiveEvent, invalidate: Invalidate) {
  switch (event.type) {
    case 'job.progress':
      queryClient.setQueryData(queryKeys.jobs.progress(event.jobId), event.progress);
      return;

    case 'schedule.updated':
      queryClient.setQueryData(queryKeys.schedules.detail(event.schedule.id), event.schedule);
      invalidate(queryKeys.schedules.list);
      invalidate(['schedules', 'upcoming']);
      return;

    case 'schedule.deleted':
      queryClient.removeQueries({ queryKey: queryKeys.schedules.detail(event.scheduleId) });
      invalidate(queryKeys.schedules.list);
      invalidate(['schedules', 'upcoming']);
      return;

    default: {
      // Every remaining event carries the job's latest state.
      const { job } = event;
      queryClient.setQueryData(queryKeys.jobs.detail(job.id), job);
      if (event.type !== 'job.started') {
        // A finished or rescheduled attempt has no live progress any more.
        queryClient.setQueryData(queryKeys.jobs.progress(job.id), null);
      }
      invalidate(queryKeys.jobs.executions(job.id));
      invalidate(queryKeys.jobs.lists);
      invalidate(queryKeys.dashboard.all);
      if (job.scheduleId) invalidate(queryKeys.schedules.all);
    }
  }
}

/** The toast (if any) a live event should raise, given the user's preferences. */
export function notificationForEvent(
  event: LiveEvent,
  prefs: NotificationPrefs,
  now: number = Date.now(),
): ToastInput | null {
  switch (event.type) {
    case 'job.completed':
      return prefs.jobCompleted
        ? {
            tone: 'success',
            title: 'Job completed',
            description: event.job.name,
            href: jobDetailsPath(event.job.id),
            hrefLabel: 'View job',
          }
        : null;
    case 'job.failed':
      return prefs.jobFailed
        ? {
            tone: 'error',
            title: 'Job failed',
            description: `${event.job.name}: ${event.error.message}`,
            href: jobDetailsPath(event.job.id),
            hrefLabel: 'View details',
          }
        : null;
    case 'job.retry_scheduled': {
      if (!prefs.jobRetry) return null;
      const wait = Math.max(0, Date.parse(event.nextRunAt) - now);
      return {
        tone: 'warning',
        title: `Attempt ${event.attempt} failed — retrying`,
        description: `${event.job.name} will retry in ${formatDuration(wait)}. ${event.error.message}`,
        href: jobDetailsPath(event.job.id),
        hrefLabel: 'View job',
      };
    }
    default:
      return null;
  }
}
