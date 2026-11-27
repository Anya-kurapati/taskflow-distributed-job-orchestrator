import { createContext } from 'react';

import type { LiveStatus } from '@/types/events';

export interface LiveUpdatesValue {
  status: LiveStatus;
}

/** Without a provider, the app behaves as if live updates are unavailable (it polls). */
export const LiveUpdatesContext = createContext<LiveUpdatesValue>({ status: 'unavailable' });
