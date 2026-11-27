import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { ToastContext, type Toast, type ToastContextValue, type ToastTone } from './toast-context';

/** How long each kind of toast stays up. Errors linger so they aren't missed. */
const DURATION_MS: Record<ToastTone, number> = {
  success: 5_000,
  info: 5_000,
  warning: 8_000,
  error: 12_000,
};

/** Bursts of events (e.g. many jobs finishing together) never cover the screen. */
const MAX_VISIBLE = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback<ToastContextValue['notify']>(
    (input) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { ...input, id }].slice(-MAX_VISIBLE));
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), DURATION_MS[input.tone]),
      );
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const value = useMemo(() => ({ toasts, notify, dismiss }), [toasts, notify, dismiss]);
  return <ToastContext value={value}>{children}</ToastContext>;
}
