import type { z } from 'zod';

import type { jobProgressSchema, liveEventSchema } from '@/schemas/events.schema';

export type LiveEvent = z.infer<typeof liveEventSchema>;
export type LiveEventType = LiveEvent['type'];
export type JobProgress = z.infer<typeof jobProgressSchema>;

/** Connection state of the live-updates stream. */
export type LiveStatus = 'connecting' | 'open' | 'reconnecting' | 'unavailable';
