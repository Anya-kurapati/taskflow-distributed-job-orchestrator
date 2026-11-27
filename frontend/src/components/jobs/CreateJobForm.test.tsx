import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { CreateJobRequest } from '@/types/job';

import { CreateJobForm } from './CreateJobForm';

function setup() {
  const user = userEvent.setup();
  const onSubmit = vi.fn<(request: CreateJobRequest) => Promise<unknown>>().mockResolvedValue({});
  renderWithProviders(<CreateJobForm onSubmit={onSubmit} />);
  const submit = () => user.click(screen.getByRole('button', { name: 'Create job' }));
  // userEvent.type treats "{" as a key descriptor, so JSON is pasted instead.
  const replaceText = async (label: string, text: string) => {
    const field = screen.getByLabelText(label);
    await user.clear(field);
    await user.click(field);
    if (text) await user.paste(text);
  };
  return { user, onSubmit, submit, replaceText };
}

/** Waits for task types to load from the mock API, then picks one. */
async function chooseTaskType(user: ReturnType<typeof userEvent.setup>, type = 'email.send') {
  await screen.findByRole('option', { name: /Send email/ });
  await user.selectOptions(screen.getByLabelText('Task type'), type);
}

describe('CreateJobForm', () => {
  it('validates required fields and does not submit', async () => {
    const { submit, onSubmit } = setup();

    await submit();

    expect(await screen.findByText('Name must be at least 3 characters')).toBeInTheDocument();
    expect(screen.getByText('Select a task type', { selector: 'p' })).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('prefills the payload from the selected task type and validates JSON', async () => {
    const { user, submit, onSubmit, replaceText } = setup();
    await user.type(screen.getByLabelText('Job name'), 'Welcome emails');
    await chooseTaskType(user);

    expect(screen.getByLabelText('Payload')).toHaveValue(
      JSON.stringify(
        { template: 'welcome', recipients: ['user@example.com'], locale: 'en' },
        null,
        2,
      ),
    );

    await replaceText('Payload', '{ not json');
    await submit();
    expect(await screen.findByText('Payload must be valid JSON')).toBeInTheDocument();

    await replaceText('Payload', '[1, 2]');
    await submit();
    expect(await screen.findByText('Payload must be a JSON object')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a registered task job with execution settings', async () => {
    const { user, submit, onSubmit, replaceText } = setup();
    await user.type(screen.getByLabelText('Job name'), 'Welcome emails');
    await user.type(screen.getByLabelText(/Description/), 'Sends the welcome series');
    await chooseTaskType(user);
    await replaceText('Payload', '{"recipients":["a@example.com"]}');
    await replaceText('Timeout (seconds)', '120');
    await replaceText('Retry count', '5');
    await replaceText('Retry delay (seconds)', '60');

    expect(screen.getByText('Up to 6 attempts in total, 1m 0s apart.')).toBeInTheDocument();
    await submit();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Welcome emails',
      description: 'Sends the welcome series',
      priority: 'MEDIUM',
      target: { kind: 'TASK', taskType: 'email.send', payload: { recipients: ['a@example.com'] } },
      scheduledAt: null,
      timeoutSeconds: 120,
      maxRetries: 5,
      retryDelaySeconds: 60,
    });
  });

  it('validates and submits an HTTP webhook job', async () => {
    const { user, submit, onSubmit, replaceText } = setup();
    await user.type(screen.getByLabelText('Job name'), 'Notify billing');
    await user.click(screen.getByRole('radio', { name: /HTTP webhook/ }));

    await replaceText('URL', 'ftp://example.com/hook');
    await submit();
    expect(await screen.findByText('Enter a valid http:// or https:// URL')).toBeInTheDocument();

    await replaceText('URL', 'https://billing.example.com/hooks');
    await user.click(screen.getByRole('button', { name: 'Add header' }));
    await user.type(screen.getByLabelText('Header 2 name'), 'Authorization');
    await user.type(screen.getByLabelText('Header 2 value'), 'Bearer secret');
    await replaceText('Request body (optional)', '{"event":"ready"}');
    await submit();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0].target).toEqual({
      kind: 'HTTP',
      method: 'POST',
      url: 'https://billing.example.com/hooks',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer secret' },
      body: { event: 'ready' },
    });
  });

  it('requires a future time when scheduling', async () => {
    const { user, submit, onSubmit } = setup();
    await user.type(screen.getByLabelText('Job name'), 'Later job');
    await chooseTaskType(user);
    await user.click(screen.getByRole('radio', { name: 'Schedule for later' }));

    fireEvent.change(screen.getByLabelText('Run at'), { target: { value: '2020-01-01T09:00' } });
    await submit();
    expect(await screen.findByText('Choose a time in the future')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Run at'), { target: { value: '2999-01-01T09:00' } });
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0].scheduledAt).toBe(new Date('2999-01-01T09:00').toISOString());
  });

  it('rejects out-of-range execution settings', async () => {
    const { submit, replaceText } = setup();
    await replaceText('Timeout (seconds)', '0');
    await replaceText('Retry count', '11');
    await replaceText('Retry delay (seconds)', '-1');
    await submit();

    expect(await screen.findByText('Timeout must be at least 1')).toBeInTheDocument();
    expect(screen.getByText('At most 10 retries')).toBeInTheDocument();
    expect(screen.getByText('Retry delay must be at least 0')).toBeInTheDocument();
  });
});
