import { useEffect, useRef } from 'react';

/** Returns a function that calls `callback` once calls stop for `delayMs`. */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): (...args: Args) => void {
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(callback);

  useEffect(() => {
    latest.current = callback;
  }, [callback]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (...args: Args) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => latest.current(...args), delayMs);
  };
}
