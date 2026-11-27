import type { ReactNode } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { env } from '@/config/env';
import { useAuth } from '@/hooks/useAuth';
import { useLiveStatus } from '@/hooks/useLiveUpdates';
import { useNotificationPrefs } from '@/hooks/useNotificationPrefs';
import type { NotificationPrefs } from '@/utils/notificationPrefs';
import { formatDuration, toTitleCase } from '@/utils/format';

export function SettingsPage() {
  const { user, isMockAuth } = useAuth();

  return (
    <>
      <PageHeader title="Settings" description="Your profile and application configuration." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Profile">
          {user ? (
            <div className="flex items-center gap-4">
              <Avatar name={user.name} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{user.name}</p>
                <p className="truncate text-sm text-slate-500">{user.email}</p>
                <p className="mt-1 text-sm text-slate-500">Role: {toTitleCase(user.role)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">You are not signed in.</p>
          )}
          {isMockAuth && (
            <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              This is a development-only mock user. Real authentication is not yet implemented.
            </p>
          )}
        </Card>

        <Card title="Application">
          <dl className="divide-y divide-slate-100 text-sm">
            <Row label="API base URL">
              <code className="font-mono text-xs break-all">{env.apiBaseUrl}</code>
            </Row>
            <Row label="Request timeout">{formatDuration(env.apiTimeoutMs)}</Row>
            <Row label="Dashboard refresh">Every {formatDuration(env.pollIntervalMs)}</Row>
            <Row label="Environment">{toTitleCase(env.mode)}</Row>
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            Configured via environment variables at build time — see <code>.env.example</code>.
          </p>
        </Card>
        <NotificationSettings />
      </div>
    </>
  );
}

const NOTIFICATION_OPTIONS: Array<{ key: keyof NotificationPrefs; label: string; hint: string }> = [
  { key: 'jobCompleted', label: 'Job completed', hint: 'When a job finishes successfully.' },
  { key: 'jobFailed', label: 'Job failed', hint: 'When a job fails with no retries left.' },
  { key: 'jobRetry', label: 'Retry scheduled', hint: 'When an attempt fails and will be retried.' },
  {
    key: 'connection',
    label: 'Connection status',
    hint: 'When live updates disconnect or reconnect.',
  },
];

const LIVE_STATUS_TEXT = {
  open: 'Connected — updates arrive in real time.',
  connecting: 'Connecting…',
  reconnecting: 'Reconnecting…',
  unavailable: 'Unavailable — pages refresh periodically instead.',
} as const;

function NotificationSettings() {
  const [prefs, setPrefs] = useNotificationPrefs();
  const liveStatus = useLiveStatus();

  return (
    <Card title="Notifications" className="lg:col-span-2">
      <p className="text-sm text-slate-600">
        Live updates:{' '}
        <span className="font-medium text-slate-900">{LIVE_STATUS_TEXT[liveStatus]}</span>
      </p>
      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-slate-700">Show a notification for</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {NOTIFICATION_OPTIONS.map((option) => (
            <label key={option.key} className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={prefs[option.key]}
                onChange={(event) => setPrefs({ [option.key]: event.target.checked })}
                className="mt-0.5 size-4 accent-indigo-600"
              />
              <span>
                {option.label}
                <span className="block text-xs text-slate-500">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="mt-4 text-xs text-slate-500">Saved in this browser.</p>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-900">{children}</dd>
    </div>
  );
}
