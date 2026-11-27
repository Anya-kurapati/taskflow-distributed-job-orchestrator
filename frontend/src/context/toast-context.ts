import { createContext } from 'react';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastInput {
  tone: ToastTone;
  title: string;
  description?: string;
  /** In-app link, e.g. to the job the notification is about. */
  href?: string;
  hrefLabel?: string;
}

export interface Toast extends ToastInput {
  id: number;
}

export interface ToastContextValue {
  toasts: Toast[];
  notify: (toast: ToastInput) => number;
  dismiss: (id: number) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
