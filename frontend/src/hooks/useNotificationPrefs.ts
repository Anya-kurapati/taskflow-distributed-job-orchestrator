import { useSyncExternalStore } from 'react';

import {
  getNotificationPrefs,
  setNotificationPrefs,
  subscribeNotificationPrefs,
} from '@/utils/notificationPrefs';

export function useNotificationPrefs() {
  const prefs = useSyncExternalStore(subscribeNotificationPrefs, getNotificationPrefs);
  return [prefs, setNotificationPrefs] as const;
}
