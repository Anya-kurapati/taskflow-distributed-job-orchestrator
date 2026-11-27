# context/

React Context providers live here — **only when genuinely needed**.

- Server data (jobs, workers, metrics) belongs in TanStack Query, not Context.
- Component-local UI state belongs in `useState` / `useReducer`.
- Reach for Context only for app-wide client state that many distant
  components need, e.g. the authenticated user, theme, or feature flags.

Current contexts:

- `AuthProvider` / `auth-context.ts` — the signed-in user (a development-only
  mock for now). Consume it with `useAuth()` from `@/hooks/useAuth`.
- `ToastProvider` / `toast-context.ts` — notification toasts. Use `useToast()`;
  they render via `<Toaster>` in the app shell.
- `LiveUpdatesProvider` / `live-updates-context.ts` — the Server-Sent Events
  connection. It writes events into the TanStack Query cache (it holds no data
  itself) and exposes only the connection status: `useLiveStatus()`,
  `usePollInterval()`.
