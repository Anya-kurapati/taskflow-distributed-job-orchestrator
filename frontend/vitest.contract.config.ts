import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Contract / user-journey tests against a running backend:
 *
 *   CONTRACT_API_URL=http://localhost:8080/api/v1 npm run test:contract
 *
 * `npm run test:contract:mock` (--mode mock) runs the same journey against the
 * MSW mock API, which verifies the test itself without a backend.
 */
export default defineConfig(({ mode }) => {
  const useMocks = mode === 'mock' || process.env.CONTRACT_USE_MOCKS === 'true';

  return {
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    test: {
      include: ['src/contract/**/*.contract.test.ts'],
      environment: 'node',
      setupFiles: useMocks ? ['./src/contract/mockServer.setup.ts'] : [],
      // Tests in the journey build on each other, so run them in order, one file at a time.
      sequence: { concurrent: false },
      fileParallelism: false,
      testTimeout: 90_000,
      env: {
        VITE_API_BASE_URL: process.env.CONTRACT_API_URL ?? 'http://localhost:8080/api/v1',
        CONTRACT_USE_MOCKS: String(useMocks),
        CONTRACT_WAIT_FOR_COMPLETION: process.env.CONTRACT_WAIT_FOR_COMPLETION ?? 'false',
      },
    },
  };
});
