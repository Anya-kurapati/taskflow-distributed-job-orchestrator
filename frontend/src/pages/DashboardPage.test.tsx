import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiUrl } from '@/mocks/handlers';
import type { DashboardSummary, JobTrends } from '@/types/dashboard';
import { buildJob } from '@/test/fixtures';
import { renderRoute } from '@/test/renderWithProviders';
import { server } from '@/test/server';

const LAZY = { timeout: 5000 };

const summary: DashboardSummary = {
  totalJobs: 12_840,
  successfulJobs: 1_284,
  failedJobs: 42,
  runningJobs: 7,
  pendingJobs: 19,
  generatedAt: '2026-11-26T12:00:00Z',
};

const trends = (range: JobTrends['range']): JobTrends => ({
  range,
  interval: 'day',
  points: [
    { timestamp: '2026-11-25T00:00:00Z', completed: 30, failed: 2 },
    { timestamp: '2026-11-26T00:00:00Z', completed: 18, failed: 0 },
  ],
});

function useFixedDashboardApi() {
  const requestedRanges: string[] = [];
  server.use(
    http.get(apiUrl('/dashboard/summary'), () => HttpResponse.json(summary)),
    http.get(apiUrl('/dashboard/trends'), ({ request }) => {
      const range = new URL(request.url).searchParams.get('range') as JobTrends['range'];
      requestedRanges.push(range);
      return HttpResponse.json(trends(range));
    }),
    http.get(apiUrl('/dashboard/recent-executions'), () =>
      HttpResponse.json([
        buildJob({ id: 'job-a', name: 'Resize images #1' }),
        buildJob({ id: 'job-b', name: 'Send emails #2', status: 'FAILED' }),
      ]),
    ),
  );
  return { requestedRanges };
}

// A stat tile: the label's card, scoped to the metrics section (labels like "Failed" recur elsewhere).
const tile = (label: string) =>
  within(screen.getByRole('region', { name: 'Job metrics' }))
    .getByText(label)
    .closest('div')!.parentElement!;

describe('DashboardPage', () => {
  it('displays the metrics returned by the summary API', async () => {
    useFixedDashboardApi();
    renderRoute('/dashboard');

    expect(await screen.findByText('1,284', {}, LAZY)).toBeInTheDocument();
    expect(within(tile('Total jobs')).getByText('12.8K')).toBeInTheDocument();
    expect(within(tile('Successful')).getByText('1,284')).toBeInTheDocument();
    expect(within(tile('Successful')).getByText('96.8% success rate')).toBeInTheDocument();
    expect(within(tile('Failed')).getByText('42')).toBeInTheDocument();
    expect(within(tile('Running')).getByText('7')).toBeInTheDocument();
    expect(within(tile('Pending')).getByText('19')).toBeInTheDocument();
  });

  it('lists recent executions linking to job details', async () => {
    useFixedDashboardApi();
    renderRoute('/dashboard');

    const list = await screen.findByRole('list', { name: 'Recent executions' }, LAZY);
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getByRole('link', { name: 'Resize images #1' })).toHaveAttribute(
      'href',
      '/jobs/job-a',
    );
    expect(within(items[1]!).getByText('Failed')).toBeInTheDocument();
  });

  it('requests trends for the selected range and offers a table view', async () => {
    const user = userEvent.setup();
    const { requestedRanges } = useFixedDashboardApi();
    renderRoute('/dashboard');

    expect(await screen.findByText(/50 finished in the last 7 days/, {}, LAZY)).toBeInTheDocument();
    expect(screen.getByText(/4\.0% failed/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '30d' }));
    expect(await screen.findByText(/in the last 30 days/)).toBeInTheDocument();
    expect(requestedRanges).toEqual(['7d', '30d']);
    expect(screen.getByRole('button', { name: '30d' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Table' }));
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3); // header + 2 buckets
    expect(
      within(rows[2]!)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['30', '2', '32']);
  });

  it('provides quick actions to create a job and view all jobs', async () => {
    useFixedDashboardApi();
    renderRoute('/dashboard');

    const main = await screen.findByRole('main', {}, LAZY);
    await within(main).findByRole('heading', { name: 'Dashboard' }, LAZY);
    expect(within(main).getByRole('link', { name: 'Create job' })).toHaveAttribute(
      'href',
      '/jobs/create',
    );
    expect(within(main).getByRole('link', { name: 'View all jobs' })).toHaveAttribute(
      'href',
      '/jobs',
    );
  });

  it('keeps other sections working when one API fails', async () => {
    useFixedDashboardApi();
    server.use(
      http.get(apiUrl('/dashboard/summary'), () =>
        HttpResponse.json({ message: 'Metrics service unavailable' }, { status: 503 }),
      ),
    );
    renderRoute('/dashboard');

    // 5xx responses are not retried in tests (retry: false), so the error shows immediately.
    expect(await screen.findByText('Metrics service unavailable', {}, LAZY)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Resize images #1' })).toBeInTheDocument();
  });
});
