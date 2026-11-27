/**
 * Error bodies the client understands. The backend should prefer RFC 7807
 * Problem Details (Spring Boot's `ProblemDetail`), optionally with field errors:
 *
 *   { "type": "...", "title": "Bad Request", "status": 400,
 *     "detail": "Validation failed", "errors": [{ "field": "target.url", "message": "..." }] }
 *
 * Spring Boot's default error body and a plain `{ message }` are also accepted.
 */
export interface ApiErrorBody {
  // Plain / Spring default (`server.error.include-message=always`)
  message?: string;
  error?: string;
  code?: string;
  // RFC 7807 Problem Details
  title?: string;
  detail?: string;
  status?: number;
  // Field validation errors, in any of the common shapes
  errors?:
    Array<{ field?: string; message?: string; defaultMessage?: string }> | Record<string, string>;
  fieldErrors?: Record<string, string>;
}

export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'cancelled';
