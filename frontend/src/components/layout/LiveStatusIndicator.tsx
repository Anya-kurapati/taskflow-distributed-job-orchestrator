import { env } from '@/config/env';
import { useLiveStatus } from '@/hooks/useLiveUpdates';
import type { LiveStatus } from '@/types/events';
import { cn } from '@/utils/cn';
import { formatDuration } from '@/utils/format';

const STATES: Record<LiveStatus, { label: string; dot: string; description: string }> = {
  open: {
    label: 'Live',
    dot: 'bg-emerald-500',
    description: 'Connected — job updates arrive in real time.',
  },
  connecting: {
    label: 'Connecting…',
    dot: 'bg-slate-400 animate-pulse',
    description: 'Connecting to live updates.',
  },
  reconnecting: {
    label: 'Reconnecting…',
    dot: 'bg-amber-500 animate-pulse',
    description: 'Live updates were interrupted and are reconnecting.',
  },
  unavailable: {
    label: 'Polling',
    dot: 'bg-slate-400',
    description: 'Live updates are unavailable.',
  },
};

/** Live-updates connection state, shown in the header. */
export function LiveStatusIndicator() {
  const status = useLiveStatus();
  const state = STATES[status];
  const detail =
    status === 'open'
      ? state.description
      : `${state.description} Data refreshes every ${formatDuration(env.pollIntervalMs)}.`;

  return (
    <div
      role="status"
      title={detail}
      className="flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600"
    >
      <span className={cn('size-2 rounded-full', state.dot)} aria-hidden />
      <span className="sr-only">Live updates: </span>
      <span className="max-sm:sr-only">{state.label}</span>
    </div>
  );
}
