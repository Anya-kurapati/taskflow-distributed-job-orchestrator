import type { LiveEvent } from '@/types/events';

/**
 * In-memory event bus behind the mock `GET /events` SSE stream. Mutating mock
 * endpoints and the simulation publish here; each open stream subscribes.
 */

type Listener = (event: LiveEvent, id: number) => void;

const listeners = new Set<Listener>();
let sequence = 0;

export function publish(event: LiveEvent) {
  sequence += 1;
  listeners.forEach((listener) => listener(event, sequence));
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
