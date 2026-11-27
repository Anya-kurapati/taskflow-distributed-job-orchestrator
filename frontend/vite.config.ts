import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '');
  // Where the dev server forwards /api requests (the Spring Boot app).
  const proxyTarget = fileEnv.API_PROXY_TARGET ?? 'http://localhost:8080';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      // Same-origin API calls in development: the browser talks to Vite, which
      // forwards /api to the backend. No CORS configuration needed, and the SSE
      // stream (/api/v1/events) is proxied as a normal streaming response.
      proxy: {
        '/api': { target: proxyTarget, changeOrigin: true },
      },
    },
    build: {
      rolldownOptions: {
        output: {
          // Long-lived vendor chunks cache independently of app code. Only list
          // libraries every page needs — route-specific ones (e.g. Recharts)
          // must stay in their lazy route chunks.
          codeSplitting: {
            groups: [
              {
                name: 'react-vendor',
                test: /[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
              },
              { name: 'query-vendor', test: /[\\/]node_modules[\\/]@tanstack[\\/]/ },
            ],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      restoreMocks: true,
      // Integration tests render whole lazy-loaded routes; under parallel load the
      // default 5s can be too tight on slower machines.
      testTimeout: 15_000,
      exclude: ['**/node_modules/**', '**/dist/**', 'src/contract/**'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/test/**',
          'src/contract/**',
          'src/types/**',
          'src/vite-env.d.ts',
          'src/main.tsx', // bootstrap; exercised by the dev server and build
          'src/mocks/browser.ts', // service-worker wiring only
        ],
        reporter: ['text-summary', 'html'],
        // Guard against regressions; raise these as coverage improves.
        thresholds: { statements: 90, branches: 82, functions: 88, lines: 90 },
      },
      env: {
        VITE_API_BASE_URL: 'http://localhost:8080/api/v1',
      },
    },
  };
});
