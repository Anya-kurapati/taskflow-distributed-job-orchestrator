import { setupServer } from 'msw/node';

import { handlers } from '@/mocks/handlers';

/** The mock API, shared with development. Override per test with `server.use(...)`. */
export const server = setupServer(...handlers);
