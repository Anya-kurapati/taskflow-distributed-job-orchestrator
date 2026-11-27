/**
 * Per-browser notification preferences, persisted in localStorage. Exposed as
 * a tiny external store so React (useSyncExternalStore) and non-React code
 * (the live-updates stream handler) read the same values.
 */

export interface NotificationPrefs {
  jobCompleted: boolean;
  jobFailed: boolean;
  jobRetry: boolean;
  connection: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  jobCompleted: true,
  jobFailed: true,
  jobRetry: true,
  connection: true,
};

const STORAGE_KEY = 'taskflow.notificationPrefs';
const listeners = new Set<() => void>();
let current: NotificationPrefs = load();

function load(): NotificationPrefs {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_NOTIFICATION_PREFS;
    const parsed = JSON.parse(stored) as Partial<NotificationPrefs>;
    return { ...DEFAULT_NOTIFICATION_PREFS, ...parsed };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS; // storage unavailable or corrupt
  }
}

export const getNotificationPrefs = (): NotificationPrefs => current;

export function setNotificationPrefs(changes: Partial<NotificationPrefs>) {
  current = { ...current, ...changes };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Not persisted (e.g. private mode) — still applies for this session.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeNotificationPrefs(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test helper: restore defaults. */
export function resetNotificationPrefs() {
  current = DEFAULT_NOTIFICATION_PREFS;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener());
}
