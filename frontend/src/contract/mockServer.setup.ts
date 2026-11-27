import { setupServer } from 'msw/node';
import { afterAll, beforeAll } from 'vitest';

import { resetMockDb } from '@/mocks/db';
import { handlers } from '@/mocks/handlers';
import { apiClient } from '@/services/api';

/** Runs the contract journey against the MSW mock API (`--mode mock`). */
const server = setupServer(...handlers);

// MSW's Node interceptor handles `fetch` (as in the jsdom test setup); route
// Axios through its fetch adapter so requests reach the mock handlers.
apiClient.defaults.adapter = 'fetch';

beforeAll(() => {
  resetMockDb();
  server.listen({ onUnhandledFrame: 'error' });
});

afterAll(() => server.close());
