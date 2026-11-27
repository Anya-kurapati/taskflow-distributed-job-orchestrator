import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { mockDb } from '@/mocks/db';
import { renderRoute } from '@/test/renderWithProviders';

const LAZY = { timeout: 5000 };

/** Data rows of the jobs table (excluding the header). */
const rows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);

async function renderJobs(path = '/jobs') {
  const user = userEvent.setup();
  const result = renderRoute(path);
  await screen.findByRole('table', {}, LAZY);
  return { user, ...result };
}

describe('JobsPage', () => {
  it('shows the first page of jobs with pagination', async () => {
    await renderJobs();

    expect(rows()).toHaveLength(20);
    const total = mockDb.jobs.length.toLocaleString();
    expect(screen.getByText(total).closest('p')).toHaveTextContent(`Showing 1–20 of ${total}`);
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');
  });

  it('pages through results', async () => {
    const { user, router } = await renderJobs();
    const firstRow = rows()[0]!.textContent;

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    await waitFor(() => expect(router.state.location.search).toBe('?page=2'));
    await waitFor(() => expect(rows()[0]!.textContent).not.toBe(firstRow));
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
  });

  it('searches jobs by name', async () => {
    const { user, router } = await renderJobs();

    await user.type(screen.getByRole('searchbox', { name: 'Search jobs by name' }), 'invoices');

    await waitFor(() => expect(router.state.location.search).toBe('?search=invoices'));
    await waitFor(() => rows().forEach((row) => expect(row).toHaveTextContent(/Issue invoices/)));
  });

  it('filters by status and job type, and clears filters', async () => {
    const { user, router } = await renderJobs();

    await user.selectOptions(screen.getByLabelText('Status'), 'FAILED');
    await user.selectOptions(screen.getByLabelText('Job type'), 'http.webhook');

    await waitFor(() =>
      expect(router.state.location.search).toBe('?status=FAILED&type=http.webhook'),
    );
    await waitFor(() => {
      for (const row of rows()) {
        expect(row).toHaveTextContent('Failed');
        expect(row).toHaveTextContent('http.webhook');
      }
    });

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('sorts by creation date', async () => {
    const { user, router } = await renderJobs();
    const header = screen.getByRole('columnheader', { name: /Created/ });
    expect(header).toHaveAttribute('aria-sort', 'descending');

    await user.click(within(header).getByRole('button'));

    await waitFor(() => expect(router.state.location.search).toBe('?sort=createdAt%3Aasc'));
    expect(screen.getByRole('columnheader', { name: /Created/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('restores filters from the URL and navigates to job details', async () => {
    const { user, router } = await renderJobs('/jobs?status=RUNNING');

    expect(screen.getByLabelText('Status')).toHaveValue('RUNNING');
    await waitFor(() => rows().forEach((row) => expect(row).toHaveTextContent('Running')));

    const link = within(rows()[0]!).getAllByRole('link')[0]!;
    await user.click(link);
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/jobs\/job-/));
  });

  it('shows an empty state when nothing matches', async () => {
    renderRoute('/jobs?search=zzz-no-match');
    expect(await screen.findByText('No jobs match your filters.', {}, LAZY)).toBeInTheDocument();
  });
});
