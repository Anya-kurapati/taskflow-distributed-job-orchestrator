import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { mockDb } from '@/mocks/db';
import { fakeEventSourceFactory, FakeEventSource } from '@/test/fakeEventSource';
import { renderRoute } from '@/test/renderWithProviders';
import type { Job } from '@/types/job';
import { setNotificationPrefs } from '@/utils/notificationPrefs';

const LAZY = { timeout: 5000 };

const detail = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling!;
const liveIndicator = () =>
  screen.getAllByRole('status').find((el) => el.textContent.startsWith('Live updates:'))!;
const notifications = () => screen.getByRole('region', { name: 'Notifications' });

/** Opens a queued job's page with a fake live-updates stream connected. */
async function renderLiveJob() {
  const job = mockDb.jobs.find((candidate) => candidate.status === 'QUEUED')!;
  renderRoute(`/jobs/${job.id}`, { createEventSource: fakeEventSourceFactory });
  await screen.findByRole('heading', { level: 1, name: job.name }, LAZY);
  const stream = FakeEventSource.latest();
  stream.open();
  return { job, stream };
}

const running = (job: Job): Job => ({
  ...job,
  status: 'RUNNING',
  attempts: job.attempts + 1,
  startedAt: new Date().toISOString(),
});

afterEach(() => FakeEventSource.reset());

describe('live updates', () => {
  it('connects to the events endpoint and shows the connection state', async () => {
    const job = mockDb.jobs[0]!;
    renderRoute(`/jobs/${job.id}`, { createEventSource: fakeEventSourceFactory });
    await screen.findByRole('heading', { level: 1, name: job.name }, LAZY);

    expect(FakeEventSource.latest().url).toBe('http://localhost:8080/api/v1/events');
    expect(liveIndicator()).toHaveTextContent('Connecting…');
    FakeEventSource.latest().open();
    expect(liveIndicator()).toHaveTextContent('Live');
  });

  it('updates the job page when a job starts, reports progress and completes', async () => {
    const { job, stream } = await renderLiveJob();
    expect(detail('Current status')).toHaveTextContent('Queued');

    const started = running(job);
    stream.emit({
      type: 'job.started',
      job: started,
      execution: {
        id: `${job.id}-attempt-1`,
        jobId: job.id,
        attempt: 1,
        status: 'RUNNING',
        startedAt: started.startedAt!,
        workerId: 'worker-2',
      },
    });
    await waitFor(() => expect(detail('Current status')).toHaveTextContent('Running'));

    stream.emit({
      type: 'job.progress',
      jobId: job.id,
      executionId: `${job.id}-attempt-1`,
      progress: { percent: 40, message: 'Synced 3,360 of 8,400 records' },
    });
    const bar = await screen.findByRole('progressbar', { name: /Progress of attempt/ });
    expect(bar).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByText('Synced 3,360 of 8,400 records')).toBeInTheDocument();

    stream.emit({
      type: 'job.completed',
      job: { ...started, status: 'COMPLETED', completedAt: new Date().toISOString() },
    });
    await waitFor(() => expect(detail('Current status')).toHaveTextContent('Completed'));
    expect(
      screen.queryByRole('progressbar', { name: /Progress of attempt/ }),
    ).not.toBeInTheDocument();
    const toast = within(notifications()).getByRole('status');
    expect(toast).toHaveTextContent('Job completed');
    expect(toast).toHaveTextContent(job.name);
    expect(within(toast).getByRole('link', { name: 'View job' })).toHaveAttribute(
      'href',
      `/jobs/${job.id}`,
    );
  });

  it('shows retries and failures as they happen', async () => {
    const { job, stream } = await renderLiveJob();
    const error = { message: 'Connection reset by peer', code: 'ECONNRESET' };

    stream.emit({
      type: 'job.retry_scheduled',
      job: {
        ...running(job),
        status: 'SCHEDULED',
        lastError: error,
        nextRunAt: new Date(Date.now() + 30_000).toISOString(),
      },
      error,
      attempt: 1,
      nextRunAt: new Date(Date.now() + 30_000).toISOString(),
    });
    await waitFor(() => expect(detail('Current status')).toHaveTextContent('Scheduled'));
    expect(
      screen.getByRole('region', { name: 'Last attempt failed — retry scheduled' }),
    ).toBeInTheDocument();
    expect(within(notifications()).getByRole('status')).toHaveTextContent(
      /Attempt 1 failed — retrying.*will retry in (29|30)s. Connection reset by peer/,
    );

    stream.emit({
      type: 'job.failed',
      job: {
        ...running(job),
        status: 'FAILED',
        lastError: error,
        completedAt: new Date().toISOString(),
      },
      error,
    });
    await waitFor(() => expect(detail('Current status')).toHaveTextContent('Failed'));
    expect(within(notifications()).getByRole('alert')).toHaveTextContent(
      `Job failed${job.name}: Connection reset by peer`,
    );
  });

  it('respects notification preferences', async () => {
    setNotificationPrefs({ jobCompleted: false });
    const { job, stream } = await renderLiveJob();

    stream.emit({ type: 'job.completed', job: { ...running(job), status: 'COMPLETED' } });

    await waitFor(() => expect(detail('Current status')).toHaveTextContent('Completed'));
    expect(within(notifications()).queryByRole('status')).not.toBeInTheDocument();
  });

  it('ignores unknown or malformed events', async () => {
    const { stream } = await renderLiveJob();
    stream.emit({ type: 'worker.heartbeat', workerId: 'w1' });
    stream.emit({ type: 'job.completed', job: { id: 'incomplete' } });
    expect(detail('Current status')).toHaveTextContent('Queued');
  });

  it('reports interruptions and reconnections', async () => {
    const { stream } = await renderLiveJob();

    stream.fail(); // browser will retry by itself
    expect(liveIndicator()).toHaveTextContent('Reconnecting…');
    expect(notifications()).toHaveTextContent('Live updates interrupted');

    stream.open();
    expect(liveIndicator()).toHaveTextContent('Live');
    expect(notifications()).toHaveTextContent('Live updates reconnected');
  });

  it('reconnects with a new stream when the server closes the connection', async () => {
    const { stream } = await renderLiveJob();

    stream.fail({ closed: true });

    expect(stream.closed).toBe(true);
    // Backoff: first retry after ~1s.
    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(2), { timeout: 3000 });
    FakeEventSource.latest().open();
    expect(liveIndicator()).toHaveTextContent('Live');
  });
});
