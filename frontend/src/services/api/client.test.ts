import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { shouldRetry } from '@/config/queryClient';
import { apiUrl } from '@/mocks/handlers';
import { server } from '@/test/server';
import { onUnauthorized, setAuthTokenProvider } from '@/utils/authEvents';

import { apiClient, ApiError } from './client';

/** Makes GET /probe respond as given and returns the ApiError the client throws. */
async function errorFor(response: () => Response | Promise<Response>): Promise<ApiError> {
  server.use(http.get(apiUrl('/probe'), response));
  try {
    await apiClient.get('/probe');
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('Expected the request to fail');
}

afterEach(() => setAuthTokenProvider(() => null));

describe('API client error handling', () => {
  it('reads RFC 7807 Problem Details with field errors (Spring ProblemDetail)', async () => {
    const error = await errorFor(() =>
      HttpResponse.json(
        {
          type: 'about:blank',
          title: 'Bad Request',
          status: 400,
          detail: 'Validation failed',
          errors: [
            { field: 'target.url', message: 'Host is not allowed' },
            { field: 'timeoutSeconds', defaultMessage: 'must be less than or equal to 86400' },
          ],
        },
        { status: 400, headers: { 'X-Request-Id': 'req-42' } },
      ),
    );

    expect(error).toMatchObject({
      message: 'Validation failed',
      status: 400,
      kind: 'http',
      requestId: 'req-42',
      fieldErrors: {
        'target.url': 'Host is not allowed',
        timeoutSeconds: 'must be less than or equal to 86400',
      },
    });
    expect(error.isClientError).toBe(true);
  });

  it("reads Spring Boot's default error body", async () => {
    const error = await errorFor(() =>
      HttpResponse.json(
        {
          timestamp: '2026-11-26T10:00:00Z',
          status: 409,
          error: 'Conflict',
          message: 'Job already finished',
          path: '/api/v1/jobs/1/cancel',
        },
        { status: 409 },
      ),
    );
    expect(error).toMatchObject({ message: 'Job already finished', status: 409 });
  });

  it('falls back to a friendly message per status when the body has none', async () => {
    expect((await errorFor(() => new HttpResponse(null, { status: 403 }))).message).toBe(
      "You don't have permission to do this.",
    );
    expect(
      (
        await errorFor(() =>
          HttpResponse.json({ message: 'No message available' }, { status: 404 }),
        )
      ).message,
    ).toBe('The requested item was not found.');
    expect(
      (await errorFor(() => new HttpResponse('<html>Bad gateway</html>', { status: 502 }))).message,
    ).toBe('The server ran into a problem (502). Please try again.');
  });

  it('exposes Retry-After for rate limiting', async () => {
    const error = await errorFor(
      () => new HttpResponse(null, { status: 429, headers: { 'Retry-After': '30' } }),
    );
    expect(error).toMatchObject({
      message: 'Too many requests. Please wait a moment and try again.',
      retryAfterSeconds: 30,
    });
  });

  it('reports network failures as kind "network"', async () => {
    const error = await errorFor(() => HttpResponse.error());
    expect(error).toMatchObject({ kind: 'network', status: undefined });
    expect(error.message).toMatch(/Unable to reach the TaskFlow API|offline/);
  });

  it('broadcasts 401 responses so the app can end the session', async () => {
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);

    const error = await errorFor(() => new HttpResponse(null, { status: 401 }));
    unsubscribe();

    expect(error.message).toBe('Your session has expired. Please sign in again.');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('attaches the bearer token when one is available', async () => {
    let authorization: string | null = null;
    server.use(
      http.get(apiUrl('/probe'), ({ request }) => {
        authorization = request.headers.get('Authorization');
        return HttpResponse.json({});
      }),
    );

    await apiClient.get('/probe');
    expect(authorization).toBeNull();

    setAuthTokenProvider(() => 'token-123');
    await apiClient.get('/probe');
    expect(authorization).toBe('Bearer token-123');
  });
});

describe('query retry policy', () => {
  it.each([
    ['a network error', new ApiError('down', undefined, { kind: 'network' }), true],
    ['a timeout', new ApiError('slow', undefined, { kind: 'timeout' }), true],
    ['a 503', new ApiError('busy', 503), true],
    ['a 404', new ApiError('missing', 404), false],
    ['a 401', new ApiError('expired', 401), false],
    ['a cancellation', new ApiError('stop', undefined, { kind: 'cancelled' }), false],
  ])('retries %s: %s', (_name, error, expected) => {
    expect(shouldRetry(0, error)).toBe(expected);
  });

  it('gives up after two retries', () => {
    expect(shouldRetry(2, new ApiError('busy', 503))).toBe(false);
  });
});
