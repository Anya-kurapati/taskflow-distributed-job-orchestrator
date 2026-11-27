import { WifiOff } from 'lucide-react';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/** Explains why data has stopped updating when the network drops. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm text-amber-900"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      You&apos;re offline. Showing the last data loaded — it will refresh when you reconnect.
    </div>
  );
}
