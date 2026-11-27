import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { resetMockDb } from '@/mocks/db';
import { apiClient } from '@/services/api';
import { resetNotificationPrefs } from '@/utils/notificationPrefs';

import { server } from './server';

// findBy*/waitFor default to 1s, which is tight when the whole suite runs in
// parallel (and slower still under coverage instrumentation).
configure({ asyncUtilTimeout: 3_000 });

// MSW's Node interceptor handles `fetch`, but not jsdom's XMLHttpRequest
// (which Axios uses by default), so route Axios through its fetch adapter.
apiClient.defaults.adapter = 'fetch';

// jsdom has no canvas; axe-core probes it and jsdom logs a warning each time.
HTMLCanvasElement.prototype.getContext = () => null;

// Any request without a handler is a bug in the test (or a missing mock).
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockDb();
  resetNotificationPrefs();
});

afterAll(() => server.close());
