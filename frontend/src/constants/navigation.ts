import {
  CalendarClock,
  LayoutDashboard,
  ListChecks,
  Settings,
  type LucideIcon,
} from 'lucide-react';

import { ROUTES } from './routes';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV: NavItem[] = [
  { to: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { to: ROUTES.JOBS, label: 'Jobs', icon: ListChecks },
  { to: ROUTES.SCHEDULES, label: 'Schedules', icon: CalendarClock },
];

export const SECONDARY_NAV: NavItem[] = [
  { to: ROUTES.SETTINGS, label: 'Settings', icon: Settings },
];
