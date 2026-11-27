import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { insertJob, mockDb } from '@/mocks/db';
import { renderRoute } from '@/test/renderWithProviders';
import type { Job, JobStatus } from '@/types/job';

const LAZY = { timeout: 5000 };

const seeded = (predicate: (job: Job) => boolean) => mockDb.jobs.find(predicate)!;
const withStatus = (status: JobStatus) => seeded((job) => job.status === status);

/** The <dd> value for a <dt> label in the details page. */
const detail = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling!;

async function renderJob(job: Job) {
  const user = userEvent.setup();
  renderRoute(`/jobs/${job.id}`);
  await screen.findByRole('heading', { level: 1, name: job.name }, LAZY);
  return user;
}

describe('JobDetailsPage', () => {
  it('shows status, attempts, configuration, error details and execution history', async () => {
    const job = withStatus('FAILED');
    await renderJob(job);

    expect(detail('Current status')).toHaveTextContent('Failed');
    expect(detail('Attempts')).toHaveTextContent(`${job.attempts} of ${job.maxRetries + 1}`);
    expect(detail('Next scheduled execution')).toHaveTextContent('Not scheduled');
    expect(detail('Retry count')).toBeInTheDocument();

    const errorPanel = screen.getByRole('region', { name: 'Job failed' });
    expect(errorPanel).toHaveTextContent(job.lastError!.message);

    const history = await screen.findByRole('table', { name: /Execution attempts/ });
    expect(within(history).getAllByRole('row')).toHaveLength(job.attempts + 1);
  });

  it('retries a failed job', async () => {
    const job = withStatus('FAILED');
    const user = await renderJob(job);

    await user.click(screen.getByRole('button', { name: 'Retry job' }));

    await waitFor(() => expect(detail('Current status')).toHaveTextContent('Queued'));
    expect(screen.queryByRole('button', { name: 'Retry job' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Job failed' })).not.toBeInTheDocument();
  });

  it('shows the next scheduled execution and pauses/resumes', async () => {
    const job = seeded((candidate) => candidate.status === 'SCHEDULED' && candidate.attempts === 0);
    const user = await renderJob(job);

    expect(detail('Next scheduled execution')).toHaveTextContent(/in \d+/);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    await waitFor(() => expect(detail('Current status')).toHaveTextContent('Paused'));
    expect(detail('Next scheduled execution')).toHaveTextContent('Paused');

    await user.click(screen.getByRole('button', { name: 'Resume' }));
    await waitFor(() => expect(detail('Current status')).toHaveTextContent('Scheduled'));
  });

  it('shows the last error while an automatic retry is pending', async () => {
    const job = seeded((candidate) => candidate.status === 'SCHEDULED' && candidate.attempts > 0);
    await renderJob(job);

    expect(
      screen.getByRole('region', { name: 'Last attempt failed — retry scheduled' }),
    ).toHaveTextContent(job.lastError!.message);
    expect(detail('Next scheduled execution')).toHaveTextContent('Automatic retry');
  });

  it('asks for confirmation before cancelling a running job', async () => {
    const job = withStatus('RUNNING');
    const user = await renderJob(job);

    await user.click(screen.getByRole('button', { name: 'Cancel job' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'The running attempt will be stopped',
    );
    await user.click(screen.getByRole('button', { name: 'Keep job' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(detail('Current status')).toHaveTextContent('Running');

    await user.click(screen.getByRole('button', { name: 'Cancel job' }));
    await user.click(screen.getByRole('button', { name: 'Yes, cancel job' }));
    await waitFor(() => expect(detail('Current status')).toHaveTextContent('Cancelled'));
    expect(
      screen.queryByRole('button', { name: /Cancel job|Pause|Retry/ }),
    ).not.toBeInTheDocument();
  });

  it('shows webhook configuration with secrets masked', async () => {
    const job = insertJob({
      name: 'Notify partner',
      description: null,
      priority: 'MEDIUM',
      target: {
        kind: 'HTTP',
        method: 'POST',
        url: 'https://partner.example.com/hook',
        headers: { Authorization: 'Bearer top-secret', 'X-Source': 'taskflow' },
        body: { ok: true },
      },
      scheduledAt: null,
      timeoutSeconds: 30,
      maxRetries: 0,
      retryDelaySeconds: 0,
    });
    await renderJob(job);

    expect(screen.getByText('https://partner.example.com/hook')).toBeInTheDocument();
    expect(screen.getByText('taskflow')).toBeInTheDocument();
    expect(screen.queryByText(/top-secret/)).not.toBeInTheDocument();
    expect(screen.getByText('••••••••')).toBeInTheDocument();
    expect(await screen.findByText("This job hasn't run yet.")).toBeInTheDocument();
  });

  it('shows a not-found state for unknown jobs', async () => {
    renderRoute('/jobs/missing');
    expect(await screen.findByRole('heading', { name: 'Job not found' }, LAZY)).toBeInTheDocument();
  });
});
