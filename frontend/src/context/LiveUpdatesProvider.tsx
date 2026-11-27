import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { env } from '@/config/env';
import { useToast } from '@/hooks/useToast';
import { liveEventSchema } from '@/schemas/events.schema';
import type { LiveStatus } from '@/types/events';
import { formatDuration } from '@/utils/format';
import { applyLiveEvent, createBatchedInvalidator, notificationForEvent } from '@/utils/liveEvents';
import { getNotificationPrefs } from '@/utils/notificationPrefs';

import { LiveUpdatesContext } from './live-updates-context';

/** The subset of the browser `EventSource` API used here (lets tests inject a fake). */
export interface EventSourceLike {
  readonly readyState: number;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent<string>) => void) | null;
  onerror: ((event: Event) => void) | null;
  close(): void;
}

export type EventSourceFactory = (url: string) => EventSourceLike;

const CLOSED = 2; // EventSource.CLOSED
const MAX_RETRY_DELAY_MS = 30_000;

const defaultFactory: EventSourceFactory | null =
  typeof EventSource === 'undefined' ? null : (url) => new EventSource(url);

interface LiveUpdatesProviderProps {
  children: ReactNode;
  /** null disables live updates (the app falls back to polling). */
  createEventSource?: EventSourceFactory | null;
}

/**
 * Subscribes to the backend's Server-Sent Events stream and:
 * - writes job/schedule changes straight into the TanStack Query cache,
 * - raises notifications for completed jobs, failures and retries,
 * - tracks connection state (shown in the header; polling resumes while down),
 * - resyncs everything after a reconnect, in case events were missed.
 *
 * The browser's EventSource retries dropped connections itself; if the server
 * rejects the stream outright (CLOSED), we retry with exponential backoff.
 */
export function LiveUpdatesProvider({
  children,
  createEventSource = defaultFactory,
}: LiveUpdatesProviderProps) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const notifyRef = useRef(notify);
  const [status, setStatus] = useState<LiveStatus>(
    createEventSource ? 'connecting' : 'unavailable',
  );

  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  useEffect(() => {
    if (!createEventSource) return;

    const batch = createBatchedInvalidator(queryClient);
    const url = `${env.apiBaseUrl}/events`;
    let source: EventSourceLike | null = null;
    let retryTimer: number | undefined;
    let retryAttempt = 0;
    let hasConnected = false;
    let interrupted = false;
    let disposed = false;

    const connectionNotice = (tone: 'warning' | 'success', title: string, description: string) => {
      if (getNotificationPrefs().connection) notifyRef.current({ tone, title, description });
    };

    const connect = () => {
      const current = createEventSource(url);
      source = current;

      current.onopen = () => {
        retryAttempt = 0;
        setStatus('open');
        if (interrupted) {
          interrupted = false;
          connectionNotice('success', 'Live updates reconnected', 'Job statuses are up to date.');
          // Events may have been missed while disconnected — refetch everything.
          void queryClient.invalidateQueries();
        }
        hasConnected = true;
      };

      current.onmessage = (message) => {
        let payload: unknown;
        try {
          payload = JSON.parse(message.data);
        } catch {
          return;
        }
        const parsed = liveEventSchema.safeParse(payload);
        if (!parsed.success) return; // unknown or malformed event: ignore
        applyLiveEvent(queryClient, parsed.data, batch.invalidate);
        const toast = notificationForEvent(parsed.data, getNotificationPrefs());
        if (toast) notifyRef.current(toast);
      };

      current.onerror = () => {
        if (disposed) return;
        if (hasConnected && !interrupted) {
          interrupted = true;
          connectionNotice(
            'warning',
            'Live updates interrupted',
            `Reconnecting… meanwhile data refreshes every ${formatDuration(env.pollIntervalMs)}.`,
          );
        }
        setStatus(hasConnected ? 'reconnecting' : 'connecting');

        if (current.readyState === CLOSED) {
          current.close();
          const delay = Math.min(MAX_RETRY_DELAY_MS, 1_000 * 2 ** retryAttempt);
          retryAttempt += 1;
          retryTimer = window.setTimeout(connect, delay + Math.random() * 500);
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
      source?.close();
      batch.dispose();
    };
  }, [createEventSource, queryClient]);

  const value = useMemo(() => ({ status }), [status]);
  return <LiveUpdatesContext value={value}>{children}</LiveUpdatesContext>;
}
