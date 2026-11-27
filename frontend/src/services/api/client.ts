import axios, { type AxiosError } from 'axios';

import { env } from '@/config/env';
import type { ApiErrorBody, ApiErrorKind } from '@/types/api';
import { getAuthToken, reportUnauthorized } from '@/utils/authEvents';

interface ApiErrorOptions {
  kind?: ApiErrorKind;
  code?: string;
  /** Field path (as sent in the request, e.g. "target.url") → message. */
  fieldErrors?: Record<string, string>;
  /** Server correlation id, useful when reporting a problem. */
  requestId?: string;
  retryAfterSeconds?: number;
}

/** Normalised error thrown by every API call. */
export class ApiError extends Error {
  readonly status: number | undefined;
  readonly kind: ApiErrorKind;
  readonly code: string | undefined;
  readonly fieldErrors: Record<string, string>;
  readonly requestId: string | undefined;
  readonly retryAfterSeconds: number | undefined;

  constructor(message: string, status?: number, options: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = options.kind ?? (status === undefined ? 'network' : 'http');
    this.code = options.code;
    this.fieldErrors = options.fieldErrors ?? {};
    this.requestId = options.requestId;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }

  get isClientError() {
    return this.status !== undefined && this.status >= 400 && this.status < 500;
  }
}

/** Messages used when the server doesn't provide one. */
const STATUS_MESSAGES: Record<number, string> = {
  400: 'The request was invalid.',
  401: 'Your session has expired. Please sign in again.',
  403: "You don't have permission to do this.",
  404: 'The requested item was not found.',
  409: 'This action conflicts with the current state. Refresh and try again.',
  413: 'The request is too large.',
  422: 'Some of the submitted values are invalid.',
  429: 'Too many requests. Please wait a moment and try again.',
  503: 'The service is temporarily unavailable. Please try again shortly.',
};

function messageFor(status: number, body: ApiErrorBody | undefined): string {
  const fromBody = body?.detail ?? body?.message;
  // Spring's default body puts the reason phrase in `error` ("Bad Request");
  // prefer our friendlier text over bare reason phrases.
  if (fromBody && fromBody !== 'No message available') return fromBody;
  return (
    STATUS_MESSAGES[status] ??
    (status >= 500
      ? `The server ran into a problem (${status}). Please try again.`
      : `Request failed (${status}).`)
  );
}

/** Accepts `errors: [{field, message}]`, `errors: {field: message}` or `fieldErrors: {...}`. */
function fieldErrorsFrom(body: ApiErrorBody | undefined): Record<string, string> {
  if (!body) return {};
  if (body.fieldErrors) return body.fieldErrors;
  const { errors } = body;
  if (Array.isArray(errors)) {
    return Object.fromEntries(
      errors
        .filter((entry) => entry.field)
        .map((entry) => [entry.field!, entry.message ?? entry.defaultMessage ?? 'Invalid value']),
    );
  }
  return errors && typeof errors === 'object' ? errors : {};
}

/** Converts any Axios failure into an ApiError. Exported for tests. */
export function toApiError(error: AxiosError<ApiErrorBody | string>): ApiError {
  if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
    return new ApiError('The request was cancelled.', undefined, { kind: 'cancelled' });
  }
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new ApiError('The request timed out. Please try again.', undefined, { kind: 'timeout' });
  }
  if (!error.response) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    return new ApiError(
      offline
        ? "You're offline. Check your connection and try again."
        : 'Unable to reach the TaskFlow API.',
      undefined,
      { kind: 'network' },
    );
  }

  const { status, data, headers } = error.response;
  const body = typeof data === 'object' && data !== null ? data : undefined;
  const header = (name: string) => {
    const value: unknown = headers?.[name];
    return typeof value === 'string' ? value : undefined;
  };
  const retryAfter = Number(header('retry-after'));

  return new ApiError(messageFor(status, body), status, {
    code: body?.code,
    fieldErrors: fieldErrorsFrom(body),
    requestId: header('x-request-id') ?? header('x-correlation-id'),
    retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
  });
}

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeoutMs,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody | string>) => {
    const apiError = toApiError(error);
    if (apiError.status === 401) reportUnauthorized();
    return Promise.reject(apiError);
  },
);
