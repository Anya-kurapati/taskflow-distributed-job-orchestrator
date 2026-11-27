import { z } from 'zod';

/**
 * Validates `import.meta.env` once at startup so a missing or malformed
 * variable fails loudly instead of surfacing as a confusing network error.
 */
const envSchema = z.object({
  // An absolute URL, or a same-origin path such as "/api/v1" (served via the dev
  // proxy or a reverse proxy in production — avoids CORS entirely).
  VITE_API_BASE_URL: z.union([z.url(), z.string().regex(/^\/[^\s]*$/)], {
    error: 'Must be an absolute URL or a path starting with "/"',
  }),
  VITE_API_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  VITE_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5_000),
  VITE_ENABLE_API_MOCKS: z.stringbool().default(false),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  throw new Error(
    `Invalid environment configuration. See .env.example.\n${z.prettifyError(parsed.error)}`,
  );
}

export const env = {
  apiBaseUrl: parsed.data.VITE_API_BASE_URL,
  apiTimeoutMs: parsed.data.VITE_API_TIMEOUT_MS,
  pollIntervalMs: parsed.data.VITE_POLL_INTERVAL_MS,
  isDev: import.meta.env.DEV,
  mode: import.meta.env.MODE,
  /** Development builds sign in a mock user; production builds never do. */
  mockAuth: import.meta.env.DEV,
  /** Serve API requests from MSW mocks (src/mocks). Development only — never in production builds. */
  enableApiMocks: import.meta.env.DEV && parsed.data.VITE_ENABLE_API_MOCKS,
} as const;
