import { act } from '@testing-library/react';

import type { EventSourceLike } from '@/context/LiveUpdatesProvider';
import type { LiveEvent } from '@/types/events';

/** Controllable stand-in for the browser EventSource (jsdom has none). */
export class FakeEventSource implements EventSourceLike {
  static instances: FakeEventSource[] = [];

  readyState = 0; // CONNECTING
  onopen: EventSourceLike['onopen'] = null;
  onmessage: EventSourceLike['onmessage'] = null;
  onerror: EventSourceLike['onerror'] = null;
  closed = false;

  readonly url: string;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  static latest(): FakeEventSource {
    const instance = FakeEventSource.instances.at(-1);
    if (!instance) throw new Error('No EventSource has been created');
    return instance;
  }

  static reset() {
    FakeEventSource.instances = [];
  }

  open() {
    this.readyState = 1;
    act(() => this.onopen?.(new Event('open')));
  }

  emit(event: LiveEvent | Record<string, unknown>) {
    act(() => this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(event) })));
  }

  /** A dropped connection. `closed` = the server rejected the stream (no auto-retry). */
  fail({ closed = false } = {}) {
    this.readyState = closed ? 2 : 0;
    act(() => this.onerror?.(new Event('error')));
  }

  close() {
    this.closed = true;
    this.readyState = 2;
  }
}

export const fakeEventSourceFactory = (url: string) => new FakeEventSource(url);
