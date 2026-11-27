# TaskFlow Frontend

Web UI for the TaskFlow distributed job orchestrator.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router · TanStack Query · Axios ·
React Hook Form · Zod · Recharts · Lucide React · Vitest · React Testing Library

## Getting started

Requires Node.js 20.19+.

```bash
cd frontend
npm install
cp .env.example .env.local   # optional — .env.development already has local defaults
npm run dev                  # http://localhost:5173
```

## Scripts

| Script                       | Purpose                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`                | Start the Vite dev server                                                        |
| `npm run build`              | Type-check and build for production                                              |
| `npm run preview`            | Serve the production build locally                                               |
| `npm run typecheck`          | Run the TypeScript compiler only                                                 |
| `npm run lint`               | Lint with ESLint (`lint:fix` to fix)                                             |
| `npm run format`             | Format with Prettier (`format:check`)                                            |
| `npm run test`               | Run unit/component tests once                                                    |
| `npm run test:watch`         | Run tests in watch mode                                                          |
| `npm run test:coverage`      | Tests with coverage report and thresholds (`coverage/index.html`)                |
| `npm run test:contract`      | User-journey contract test against a running backend (see _Backend integration_) |
| `npm run test:contract:mock` | The same journey against the mock API (self-check)                               |

## Environment variables

All variables are validated at startup in `src/config/env.ts`. Only `VITE_`-prefixed values reach
the browser, so **never put secrets in them**.

| Variable                | Default                 | Description                                                                      |
| ----------------------- | ----------------------- | -------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`     | _(required)_            | API base: a path like `/api/v1` (proxied) or an absolute URL                     |
| `API_PROXY_TARGET`      | `http://localhost:8080` | Dev only: where the Vite dev server forwards `/api` (not exposed to the browser) |
| `VITE_API_TIMEOUT_MS`   | `15000`                 | Axios request timeout                                                            |
| `VITE_POLL_INTERVAL_MS` | `5000`                  | Refresh interval for live views                                                  |
| `VITE_ENABLE_API_MOCKS` | `false`                 | Dev only: serve the API from MSW mocks (`true` in `.env.development`)            |

`.env.example` and `.env.development` are committed; `.env`, `.env.local`, `.env.*.local`, and
`.env.production` are git-ignored.

## Project structure

```
src/
├── components/      Reusable UI
│   ├── ui/          Generic primitives (Button, ButtonLink, Card, Avatar)
│   ├── common/      App-wide pieces (PageHeader, QueryState)
│   ├── layout/      Shell pieces (SidebarContent, MobileSidebar, Header, Breadcrumbs, UserMenu)
│   ├── dashboard/   Dashboard widgets (DashboardStats, JobTrendsCard, RecentExecutions)
│   ├── jobs/        Job feature components (JobsTable, CreateJobForm, JobDefinitionFields…)
│   └── schedules/   Schedule components (SchedulesTable, ScheduleForm, UpcomingExecutions)
├── config/          Validated env config, TanStack Query client
├── constants/       Routes, navigation, query keys, domain enums
├── context/         React Context: auth, toasts, live updates (see README inside)
├── hooks/           Custom hooks: data (useJobs, useSchedules…), live updates, toasts, auth
├── layouts/         Route layouts (AppLayout — the application shell)
├── mocks/           MSW mock API for development and tests (see README inside)
├── pages/           Route-level pages (lazy-loaded)
├── schemas/         Zod schemas for forms and API responses
├── services/api/    Axios client + one service module per resource
├── test/            Test setup, MSW server, helpers (renderWithProviders, fixtures)
├── types/           TypeScript types/interfaces
├── utils/           Pure helper functions
├── router.tsx       Route definitions
├── App.tsx          Providers
└── main.tsx         Entry point
```

Tests live next to the code they cover (`*.test.ts(x)`). Import from `src` using the `@/` alias.
`renderRoute(path)` in `src/test/renderWithProviders.tsx` renders the real route tree for
integration-style tests.

## Routes

| Route                 | Page                                                               |
| --------------------- | ------------------------------------------------------------------ |
| `/`                   | → `/dashboard`                                                     |
| `/dashboard`          | Dashboard                                                          |
| `/jobs`               | All jobs — search, filters, sort and page live in the query string |
| `/jobs/create`        | Create job                                                         |
| `/jobs/:id`           | Job details                                                        |
| `/schedules`          | Schedules and upcoming executions                                  |
| `/schedules/new`      | Create schedule                                                    |
| `/schedules/:id/edit` | Edit schedule                                                      |
| `/settings`           | Settings                                                           |
| anything else         | Not found                                                          |

Routes are defined in `src/router.tsx`; paths live in `src/constants/routes.ts` (use
`jobDetailsPath(id)` rather than building URLs by hand). Each route's `handle.crumb` provides
its header breadcrumb and the browser tab title. Pages are lazy-loaded, and route errors render
inside the shell via `RouteErrorPage`.

## Application shell

`AppLayout` provides:

- **Sidebar** — fixed on `lg` screens and up; below that it becomes a drawer opened from the
  header's menu button (closes on Escape, backdrop click, or navigation).
- **Header** — breadcrumbs, a "New job" shortcut, the user menu, and a progress bar while a
  lazy page loads.
- **User profile** — summary at the bottom of the sidebar plus a header dropdown with Settings
  and Sign out.
- A "Skip to content" link for keyboard users.

## Authentication (mock)

Real authentication is not implemented yet. In **development builds** `AuthProvider` signs in a
mock user (`src/context/mockUser.ts`); sign-out/sign-in toggle it locally. **Production builds
start signed out and never use the mock user.** Components read auth state only through
`useAuth()`, so swapping in real auth later should not require changes outside `src/context/`.

## Conventions

- **Server state → TanStack Query.** Components never call Axios directly; they use hooks in
  `hooks/`, which call `services/api/`. Query keys come from `constants/queryKeys.ts`.
- **Local UI state → `useState`/`useReducer`.** No Redux; Context only for truly global client
  state.
- **Validate at the boundary.** API responses are parsed with Zod in the service layer; forms use
  the same schemas via `zodResolver`. Types are inferred from schemas (`z.infer`).
- **Errors** from the API are normalised to `ApiError` (`services/api/client.ts`).

## Dashboard

The dashboard shows total, successful, failed, running and pending job counts; recent executions;
execution trends (stacked succeeded/failed columns for 24h / 7d / 30d, with a table view); and
quick actions to create a job or view all jobs.

**No metric is computed or hardcoded in the frontend** — every number comes from the dashboard
endpoints below. Each section loads, refreshes (`VITE_POLL_INTERVAL_MS`) and fails independently,
and creating or cancelling a job invalidates the dashboard queries.

## Scheduling

A **schedule** is a job template plus a trigger: **one-time** (a date and time) or **recurring**
(a 5-field cron expression evaluated in an IANA timezone). Each time it fires, the backend creates
a new job from the template. The schedules page lists schedules with their next and last runs,
lets you pause/resume, edit or delete them, and shows upcoming executions across all schedules.
The form previews the next five runs as you type, in the schedule's timezone and in yours.

Cron semantics live in `src/utils/cron.ts` (backed by [croner](https://github.com/Hexagon/croner),
pinned to an exact version), which the form and the mock scheduler share. They are tested in
`src/utils/cron.test.ts`, including DST transitions. The backend scheduler must behave the same
way:

- Standard 5 fields; names, ranges, lists and steps allowed; Sunday is `0` or `7`. When both
  day-of-month and day-of-week are restricted, a day matching **either** runs (classic cron).
- Times are wall-clock in the schedule's timezone, so "09:00" stays 09:00 across DST changes. A
  time skipped by spring-forward runs once, shifted forward; a repeated hour runs once.
- **No backfill:** after downtime, an overdue schedule fires once, then resumes from the next
  future time.
- **Overlap policy:** `SKIP` (the default) skips a run while the previous job is still waiting or
  running and records the run as `SKIPPED`; `ALLOW` creates overlapping jobs.
- One-time schedules become `COMPLETED` after firing. Paused schedules don't fire; resuming
  computes the next run from now. A one-time schedule whose time has passed can't be resumed —
  edit it instead. Deleting a schedule never affects jobs it already created.

## Real-time updates & notifications

The app subscribes to `GET /events`, a **Server-Sent Events** stream (one-way server → browser,
so no WebSockets). `LiveUpdatesProvider` (`src/context/`) handles it:

- **Status in place.** Events carry the job's latest state, which is written straight into the
  TanStack Query cache, so job pages, lists and the dashboard update as jobs start, progress,
  retry, fail and complete. List and dashboard refetches triggered by bursts of events are
  batched.
- **Progress.** Tasks that can measure their work send `job.progress` events (percent and an
  optional message), shown as a progress bar on the job page and the dashboard. Tasks that can't,
  and HTTP webhooks, show no bar rather than a fake one.
- **Notifications.** Toasts for job completed, job failed and retry scheduled, each linking to the
  job, plus connection interrupted/restored. Each type can be switched off in **Settings**; the
  choice is stored in the browser.
- **Connection handling.** The header shows Live / Connecting / Reconnecting / Polling. While the
  stream is up, polling is switched off. While it is down, pages fall back to polling every
  `VITE_POLL_INTERVAL_MS`. The browser's EventSource reconnects on its own; if the server rejects
  the stream, the provider retries with exponential backoff (1s → 30s, with jitter). After a
  reconnect, all data is refetched in case events were missed.

## API contract

Paths are relative to `VITE_API_BASE_URL`. Responses are validated with the Zod schemas in
`src/schemas/`, so these are the shapes the backend must return. The contract is provisional
until the backend exists.

| Method & path                              | Returns                                                                            |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| `GET /dashboard/summary`                   | `{ totalJobs, successfulJobs, failedJobs, runningJobs, pendingJobs, generatedAt }` |
| `GET /dashboard/trends?range=24h\|7d\|30d` | `{ range, interval: "hour"\|"day", points: [{ timestamp, completed, failed }] }`   |
| `GET /dashboard/recent-executions?limit=N` | `Job[]` — jobs that have started, newest `startedAt` first                         |
| `GET /task-types`                          | `TaskType[]` — `{ type, name, description, examplePayload }`                       |
| `GET /jobs`                                | `Page<Job>` — query: `search, status, type, sort, page, pageSize`                  |
| `POST /jobs`                               | `Job` (201), or 400 — body: see _Creating jobs_                                    |
| `GET /jobs/:id`                            | `Job`, or 404                                                                      |
| `GET /jobs/:id/executions`                 | `JobExecution[]`, newest attempt first                                             |
| `POST /jobs/:id/retry`                     | `Job` — only when `FAILED`; otherwise 409                                          |
| `POST /jobs/:id/pause`                     | `Job` — only when `PENDING`, `SCHEDULED` or `QUEUED`; otherwise 409                |
| `POST /jobs/:id/resume`                    | `Job` — only when `PAUSED`; otherwise 409                                          |
| `POST /jobs/:id/cancel`                    | `Job` — when waiting, running or paused; otherwise 409                             |
| `GET /schedules`                           | `Schedule[]`                                                                       |
| `GET /schedules/upcoming?limit=N`          | `[{ scheduleId, scheduleName, runAt }]` — active schedules, soonest first          |
| `POST /schedules`                          | `Schedule` (201), or 400 — body: see _Schedules_                                   |
| `GET /schedules/:id`                       | `Schedule`, or 404                                                                 |
| `PUT /schedules/:id`                       | `Schedule` — same body as create; recomputes `nextRunAt`                           |
| `DELETE /schedules/:id`                    | 204, or 404                                                                        |
| `POST /schedules/:id/pause`                | `Schedule` — only when `ACTIVE`; otherwise 409                                     |
| `POST /schedules/:id/resume`               | `Schedule` — only when `PAUSED` and it can still run; otherwise 409                |
| `GET /events`                              | SSE stream (`text/event-stream`) — see _Live events_                               |

`GET /jobs` query: `search` (case-insensitive name match), `status`, `type` (task type or
`http.webhook`), `sort` (`createdAt:desc` default, or `createdAt:asc`), `page` (1-based),
`pageSize`.

**Shapes** (authoritative definitions: `src/schemas/job.schema.ts`):

- `Job`: `id, name, description, type, status, priority, target, timeoutSeconds, maxRetries,
retryDelaySeconds, attempts, createdAt, updatedAt, scheduledAt, nextRunAt, startedAt,
completedAt, lastError`. `type` is the task type, or `http.webhook`.
- `target`: `{ kind: "TASK", taskType, payload }` or `{ kind: "HTTP", method, url, headers, body? }`.
- `JobExecution`: `id, jobId, attempt, status, startedAt, finishedAt, durationMs, workerId, error`,
  where `status` is `RUNNING`, `SUCCEEDED`, `FAILED`, `TIMED_OUT` or `CANCELLED`.
- `Page<T>`: `{ items, page, pageSize, totalItems, totalPages }`. Errors: `{ message, code? }`.
- Job statuses: `PENDING → QUEUED → RUNNING → COMPLETED | FAILED`, plus `SCHEDULED` (waiting for
  `nextRunAt`: a future start time or an automatic retry), `PAUSED` and `CANCELLED`.

**Creating jobs** — `POST /jobs` body: `{ name, description?, priority, target, scheduledAt?,
timeoutSeconds (1–86400), maxRetries (0–10), retryDelaySeconds (0–3600) }`. A job may only run a
**registered task type** or call an **HTTP(S) webhook** — never shell commands or arbitrary code.
The backend must enforce this itself, and must also:

- reject task types that are not in its registry;
- block webhook URLs that resolve to internal/private addresses (SSRF protection);
- store webhook header secrets securely (the UI masks them, but the API returns them as-is today).

**Definitions:** `successfulJobs` = `COMPLETED`; `pendingJobs` = `PENDING` + `QUEUED` +
`SCHEDULED`. Trend buckets count `COMPLETED`/`FAILED` jobs by completion time; the last bucket is
the current, partial one. `attempts` counts executions; `maxRetries` is retries after the first
attempt, so a job runs at most `maxRetries + 1` times automatically (a manual retry adds one more
attempt). The reference implementation of all of this is `src/mocks/db.ts`.

**Schedules** (`src/schemas/schedule.schema.ts`) — body:
`{ name, description?, trigger, overlapPolicy ("SKIP" | "ALLOW"), jobTemplate }`, where `trigger`
is `{ type: "ONCE", runAt }` (ISO 8601, must be in the future) or
`{ type: "CRON", expression, timezone }`, and `jobTemplate` is
`{ priority, target, timeoutSeconds, maxRetries, retryDelaySeconds }` (same rules as jobs). A
`Schedule` adds `id, status (ACTIVE | PAUSED | COMPLETED), nextRunAt, lastRunAt, lastJobId,
lastRunOutcome (CREATED | SKIPPED), createdAt, updatedAt`. Jobs created by a schedule have
`scheduleId` set. Reference scheduler: `src/mocks/schedules.ts`.

**Live events** (`src/schemas/events.schema.ts`) — each SSE message has an `id` (monotonic, so
the browser can resume with `Last-Event-ID`) and a JSON `data` payload with a `type`:

| `type`                | Payload                                                      |
| --------------------- | ------------------------------------------------------------ |
| `job.created`         | `{ job }`                                                    |
| `job.updated`         | `{ job }` — queued, paused, resumed, cancelled, manual retry |
| `job.started`         | `{ job, execution }`                                         |
| `job.progress`        | `{ jobId, executionId, progress: { percent, message? } }`    |
| `job.completed`       | `{ job }`                                                    |
| `job.retry_scheduled` | `{ job, error, attempt, nextRunAt }` — an automatic retry    |
| `job.failed`          | `{ job, error }` — final failure, no retries left            |
| `schedule.updated`    | `{ schedule }`                                               |
| `schedule.deleted`    | `{ scheduleId }`                                             |

Clients ignore unknown types, so new events can be added safely. The server should send a
keep-alive comment (`: ping`) every ~15s so proxies don't close idle streams.

### Mock API (development)

Until the backend exists, `npm run dev` serves this API from [MSW](https://mswjs.io) mocks with
a seeded dataset (`VITE_ENABLE_API_MOCKS=true` in `.env.development`). In the browser the mock
also runs the scheduler and simulated workers (`src/mocks/simulation.ts`): schedules fire (the
"Warm search cache" demo schedule runs every 2 minutes), and queued jobs start, report progress,
and succeed or fail with automatic retries. All of it streams over the mock SSE endpoint, so
live updates and notifications can be seen working. The app makes real HTTP
requests, which you can see in the browser's Network tab, so pointing it at the real backend is
just a matter of setting `VITE_ENABLE_API_MOCKS=false` in `.env.development.local`. Mocks are
never included in production builds. Tests use the same handlers via `src/test/server.ts`.

## Testing

Vitest + React Testing Library, with the MSW mock API serving realistic data, so most tests exercise
the real path: component → hook → service → HTTP → mock backend. Coverage is ~94% of lines, with
thresholds enforced by `npm run test:coverage`.

| Kind                 | Where                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| Component unit tests | `components/ui/ui.test.tsx`, `JobStatusBadge.test.tsx`                                                       |
| Form validation      | `CreateJobForm.test.tsx`, `SchedulesPage.test.tsx`, server field errors in `CreateJobFlow.test.tsx`          |
| API integration      | `mocks/*Api.test.ts` (contract via the service layer), `services/api/client.test.ts` (errors, auth, retries) |
| Dashboard rendering  | `DashboardPage.test.tsx`                                                                                     |
| Job creation flow    | `CreateJobFlow.test.tsx` — form → API → details page → jobs list                                             |
| Job status updates   | `LiveUpdatesProvider.test.tsx` (SSE with a fake EventSource), `JobDetailsPage.test.tsx`                      |
| App-level handling   | `layouts/appHandling.test.tsx` — 401/403, offline, route announcements, stale deploys                        |
| Accessibility        | `a11y.test.tsx` — axe-core on every page and interactive state                                               |
| Scheduling logic     | `utils/cron.test.ts` (incl. DST), `mocks/schedulesApi.test.ts`                                               |

Helpers live in `src/test/`: `renderRoute(path)` renders the real route tree, `server.use(...)`
overrides an endpoint per test, `FakeEventSource` drives live updates, `findA11yViolations()` runs
axe. Colour contrast can't be checked in jsdom; verify it in the browser (e.g. Lighthouse).

## Error, loading and auth handling

- **Loading / empty / error states** — every data section uses `QueryState` (spinner, empty
  message, error with "Try again"); sections load and fail independently.
- **Error boundaries** — page sections (dashboard cards, job details panels) are wrapped in
  `ErrorBoundary`, so one rendering crash doesn't blank the page. Route errors render inside the
  shell; an outdated code chunk after a deploy shows "A new version is available — Reload";
  anything outside the router, or a startup failure such as invalid configuration, shows a
  readable fatal-error screen instead of a blank page.
- **API errors** — the client normalises every failure into `ApiError` with `status`, `kind`
  (`http` / `network` / `timeout` / `cancelled`), `fieldErrors`, `requestId` and
  `retryAfterSeconds`, and fills in friendly messages when the server sends none. Only network
  errors, timeouts and 5xx are retried; mutations never are. Field errors from the server appear
  under the matching form inputs.
- **Authentication failures** — any 401 signs the user out and replaces the page with "Your session
  has expired"; signing in again reloads the data. 403 shows a permission message in the affected
  section. A bearer token is attached automatically once `setAuthTokenProvider()` is wired to real
  auth.
- **Offline** — a banner explains that data will refresh on reconnect.
- **Accessibility** — skip link, landmarks, labelled controls with linked hints and errors,
  focus moved into dialogs, a visible focus ring everywhere, page changes announced to screen
  readers, `prefers-reduced-motion` respected, and status never conveyed by colour alone.
- **Responsive** — sidebar becomes a drawer below 1024px; tables scroll horizontally; forms stack.

## Backend integration (Spring Boot)

The frontend is ready to switch from mocks to the real API; no code changes are expected.

1. Implement the endpoints in [API contract](#api-contract) under `/api/v1` (the reference behaviour
   is in `src/mocks/` — `db.ts`, `schedules.ts`, `handlers.ts`).
2. Start the backend on port 8080 (or set `API_PROXY_TARGET`), then create
   `.env.development.local` with `VITE_ENABLE_API_MOCKS=false` and restart `npm run dev`.
3. Run the journey check: `CONTRACT_API_URL=http://localhost:8080/api/v1 npm run test:contract`
   (add `CONTRACT_WAIT_FOR_COMPLETION=true` once workers run jobs). Every response is validated
   against the frontend's schemas, so any contract mismatch fails with the offending field.
4. Walk the journey in the browser: dashboard → create job → watch it run live → retry/cancel →
   create, pause and edit a schedule.

Spring Boot specifics that keep the contract intact:

- **JSON:** camelCase fields; timestamps as ISO-8601 strings
  (`spring.jackson.serialization.write-dates-as-timestamps=false`, use `Instant`/`OffsetDateTime`);
  enums as the upper-case names used here. `null` fields are fine.
- **Pagination:** return the `Page<T>` shape (`items, page, pageSize, totalItems, totalPages`,
  1-based `page`) rather than Spring Data's default `Page` serialisation — map it in a DTO.
- **Errors:** return RFC 7807 `ProblemDetail` (`spring.mvc.problemdetails.enabled=true`) with
  `detail`, and for validation failures an `errors` array of `{ field, message }` using request
  paths such as `target.url`. Spring's default error body (with `server.error.include-message=always`)
  also works. Optionally send `X-Request-Id`.
- **Live updates:** `GET /api/v1/events` via `SseEmitter` (or WebFlux `Flux<ServerSentEvent>`) with
  `id` on each event and a keep-alive comment every ~15s; disable response buffering in any proxy.
- **CORS:** not needed in development (Vite proxies `/api`). In production either serve the app
  and API from the same origin (recommended) or allow the app's origin for all methods and for
  `/events`.
- **Security:** enforce the rules in _Creating jobs_ server-side (registered task types only,
  SSRF-safe webhook URLs, secret handling). Return 401 for expired sessions and 403 for missing
  permissions — the UI handles both.

## Tooling notes

- TypeScript is pinned to 6.0.x because `typescript-eslint` does not yet support TypeScript 7.
- ESLint uses the flat config (`eslint.config.js`) with type-aware `typescript-eslint` rules;
  `eslint-config-prettier` turns off rules that conflict with Prettier.
- Prettier sorts Tailwind classes via `prettier-plugin-tailwindcss`.
