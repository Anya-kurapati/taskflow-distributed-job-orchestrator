import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiUrl } from '@/mocks/handlers';
import { renderRoute } from '@/test/renderWithProviders';
import { server } from '@/test/server';

const LAZY = { timeout: 5000 };

/** Fills the create-job form with a valid HTTP webhook job. */
async function fillWebhookJob(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.type(screen.getByLabelText('Job name'), name);
  await user.click(screen.getByRole('radio', { name: /HTTP webhook/ }));
  await user.type(screen.getByLabelText('URL'), 'https://hooks.example.com/deploy');
  const retries = screen.getByLabelText('Retry count');
  await user.clear(retries);
  await user.type(retries, '2');
}

describe('job creation flow', () => {
  it('creates a job from the form and lands on its details, then finds it in the list', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/jobs/create');
    await screen.findByRole('heading', { level: 1, name: 'Create job' }, LAZY);

    await fillWebhookJob(user, 'Notify deploy channel');
    await user.click(screen.getByRole('button', { name: 'Create job' }));

    // Lands on the new job's page, populated from the API.
    await screen.findByRole('heading', { level: 1, name: 'Notify deploy channel' }, LAZY);
    expect(router.state.location.pathname).toMatch(/^\/jobs\/job-/);
    const status = screen.getByText('Current status', { selector: 'dt' }).nextElementSibling;
    expect(status).toHaveTextContent('Queued');
    expect(screen.getByText('https://hooks.example.com/deploy')).toBeInTheDocument();
    expect(screen.getByText('0 of 3')).toBeInTheDocument(); // 2 retries → 3 attempts

    // The jobs list shows it first (newest first).
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    await user.click(within(breadcrumb).getByRole('link', { name: 'Jobs' }));
    await screen.findByRole('table', {}, LAZY);
    await waitFor(() =>
      expect(within(screen.getByRole('table')).getAllByRole('row')[1]).toHaveTextContent(
        'Notify deploy channel',
      ),
    );
  });

  it('shows server-side validation errors under the matching fields', async () => {
    server.use(
      http.post(apiUrl('/jobs'), () =>
        HttpResponse.json(
          {
            title: 'Bad Request',
            status: 400,
            detail: 'Validation failed',
            errors: [{ field: 'target.url', message: 'Webhook host is not on the allow-list' }],
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    const { router } = renderRoute('/jobs/create');
    await screen.findByRole('heading', { level: 1, name: 'Create job' }, LAZY);

    await fillWebhookJob(user, 'Blocked webhook');
    await user.click(screen.getByRole('button', { name: 'Create job' }));

    const url = screen.getByLabelText('URL');
    await waitFor(() =>
      expect(url).toHaveAccessibleDescription('Webhook host is not on the allow-list'),
    );
    expect(url).toHaveAttribute('aria-invalid', 'true');
    expect(url).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent('Validation failed');
    expect(router.state.location.pathname).toBe('/jobs/create'); // input is kept
    expect(screen.getByLabelText('Job name')).toHaveValue('Blocked webhook');
  });

  it('explains when the API is unreachable and lets the user try again', async () => {
    server.use(http.post(apiUrl('/jobs'), () => HttpResponse.error()));
    const user = userEvent.setup();
    renderRoute('/jobs/create');
    await screen.findByRole('heading', { level: 1, name: 'Create job' }, LAZY);

    await fillWebhookJob(user, 'Offline attempt');
    await user.click(screen.getByRole('button', { name: 'Create job' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the TaskFlow API.');
    expect(screen.getByRole('button', { name: 'Create job' })).toBeEnabled();
  });
});
