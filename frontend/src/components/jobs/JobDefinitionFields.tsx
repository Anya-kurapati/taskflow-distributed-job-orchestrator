import { Boxes, Plus, Trash2, Webhook } from 'lucide-react';
import type { ReactNode } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { codeInputClasses, describedBy, inputClasses } from '@/components/ui/form-styles';
import { FormField } from '@/components/ui/FormField';
import { HTTP_METHODS, JOB_LIMITS, JOB_PRIORITIES } from '@/constants/jobs';
import { useTaskTypes } from '@/hooks/useJobs';
import { parseJson, type JobDefinitionValues } from '@/schemas/jobDefinition.schema';
import { cn } from '@/utils/cn';
import { formatDuration, toTitleCase } from '@/utils/format';

/*
 * Field groups for a job definition (what to run + retry policy). They read the
 * form from <FormProvider>, so any form whose values extend
 * `JobDefinitionValues` can use them — the create-job and schedule forms do.
 */

const useJobDefinitionForm = () => useFormContext<JobDefinitionValues>();
const pretty = (value: unknown) => JSON.stringify(value, null, 2);

export function JobBasicsFields({ nameLabel = 'Job name' }: { nameLabel?: string }) {
  const {
    register,
    formState: { errors },
  } = useJobDefinitionForm();

  return (
    <Card title="Basics">
      <div className="grid gap-5 sm:grid-cols-3">
        <FormField
          label={nameLabel}
          htmlFor="name"
          error={errors.name?.message}
          className="sm:col-span-2"
        >
          <input
            className={inputClasses}
            autoComplete="off"
            {...describedBy('name', errors.name?.message)}
            {...register('name')}
          />
        </FormField>
        <FormField
          label="Priority"
          htmlFor="priority"
          hint="Higher priority jobs are dispatched first"
        >
          <select
            className={inputClasses}
            {...describedBy('priority', undefined, true)}
            {...register('priority')}
          >
            {JOB_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {toTitleCase(priority)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label="Description"
          htmlFor="description"
          optional
          error={errors.description?.message}
          hint={`Up to ${JOB_LIMITS.descriptionMax} characters`}
          className="sm:col-span-3"
        >
          <textarea
            rows={2}
            className={inputClasses}
            {...describedBy('description', errors.description?.message, true)}
            {...register('description')}
          />
        </FormField>
      </div>
    </Card>
  );
}

export function JobTargetFields() {
  const kind = useWatch<JobDefinitionValues, 'kind'>({ name: 'kind' });

  return (
    <Card
      title="What to run"
      description="Jobs can run a registered task type or call an HTTP webhook. Arbitrary commands and code are not supported."
    >
      <fieldset>
        <legend className="sr-only">Job type</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <KindOption
            value="TASK"
            icon={<Boxes className="size-5" aria-hidden />}
            title="Registered task"
            description="Run a task type that the workers already implement."
          />
          <KindOption
            value="HTTP"
            icon={<Webhook className="size-5" aria-hidden />}
            title="HTTP webhook"
            description="Send an HTTP request to an external endpoint."
          />
        </div>
      </fieldset>
      <div className="mt-5">{kind === 'TASK' ? <TaskFields /> : <HttpFields />}</div>
    </Card>
  );
}

function KindOption({
  value,
  icon,
  title,
  description,
}: {
  value: JobDefinitionValues['kind'];
  icon: ReactNode;
  title: string;
  description: string;
}) {
  const { register } = useJobDefinitionForm();
  return (
    <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:border-slate-300 has-checked:border-indigo-500 has-checked:bg-indigo-50/50 has-checked:ring-1 has-checked:ring-indigo-500 has-focus-visible:outline-2 has-focus-visible:outline-indigo-600">
      <input type="radio" value={value} className="sr-only" {...register('kind')} />
      <span className="text-indigo-600">{icon}</span>
      <span>
        <span className="block text-sm font-medium text-slate-900">{title}</span>
        <span className="block text-xs text-slate-500">{description}</span>
      </span>
    </label>
  );
}

function TaskFields() {
  const {
    register,
    setValue,
    getValues,
    formState: { errors, dirtyFields },
  } = useJobDefinitionForm();
  const taskTypes = useTaskTypes();
  const selectedType = useWatch<JobDefinitionValues, 'taskType'>({ name: 'taskType' });
  const selected = taskTypes.data?.find((taskType) => taskType.type === selectedType);

  const formatPayload = () => {
    const parsed = parseJson(getValues('payload'));
    if (parsed.ok) setValue('payload', pretty(parsed.value), { shouldDirty: true });
  };

  return (
    <div className="grid gap-5">
      <FormField
        label="Task type"
        htmlFor="taskType"
        error={errors.taskType?.message ?? taskTypes.error?.message}
        hint={selected?.description}
      >
        <select
          // A <select> can't hold a value until its <option> exists, so remount once the
          // task types load; React Hook Form then re-applies the stored value (e.g. when editing).
          key={taskTypes.data ? 'loaded' : 'loading'}
          className={inputClasses}
          disabled={taskTypes.isPending || Boolean(taskTypes.error)}
          {...describedBy('taskType', errors.taskType?.message, Boolean(selected))}
          {...register('taskType', {
            onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
              // Prefill the payload with the task's example until the user edits it.
              const example = taskTypes.data?.find((t) => t.type === event.target.value);
              if (example && !dirtyFields.payload) {
                setValue('payload', pretty(example.examplePayload), { shouldValidate: true });
              }
            },
          })}
        >
          <option value="">
            {taskTypes.isPending ? 'Loading task types…' : 'Select a task type'}
          </option>
          {taskTypes.data?.map((taskType) => (
            <option key={taskType.type} value={taskType.type}>
              {taskType.name} ({taskType.type})
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label="Payload"
        htmlFor="payload"
        error={errors.payload?.message}
        hint="JSON object passed to the task. Max 64 KB."
      >
        <textarea
          rows={8}
          spellCheck={false}
          className={codeInputClasses}
          {...describedBy('payload', errors.payload?.message, true)}
          {...register('payload')}
        />
      </FormField>
      <div>
        <Button variant="secondary" onClick={formatPayload} className="px-2.5 py-1 text-xs">
          Format JSON
        </Button>
      </div>
    </div>
  );
}

function HttpFields() {
  const {
    register,
    control,
    formState: { errors },
  } = useJobDefinitionForm();
  const headers = useFieldArray({ control, name: 'headers' });
  const method = useWatch({ control, name: 'method' });

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-[8rem_1fr]">
        <FormField label="Method" htmlFor="method">
          <select id="method" className={inputClasses} {...register('method')}>
            {HTTP_METHODS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="URL" htmlFor="url" error={errors.url?.message}>
          <input
            type="url"
            placeholder="https://example.com/webhooks/taskflow"
            className={inputClasses}
            {...describedBy('url', errors.url?.message)}
            {...register('url')}
          />
        </FormField>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">Headers</legend>
        {headers.fields.map((field, index) => {
          const nameError = errors.headers?.[index]?.name?.message;
          return (
            <div key={field.id} className="flex items-start gap-2">
              <div className="flex-1">
                <input
                  placeholder="Header name"
                  aria-label={`Header ${index + 1} name`}
                  className={inputClasses}
                  aria-invalid={Boolean(nameError)}
                  {...register(`headers.${index}.name`)}
                />
                {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
              </div>
              <input
                placeholder="Value"
                aria-label={`Header ${index + 1} value`}
                className={cn(inputClasses, 'flex-1')}
                {...register(`headers.${index}.value`)}
              />
              <Button
                variant="ghost"
                onClick={() => headers.remove(index)}
                aria-label={`Remove header ${index + 1}`}
                className="px-2"
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          );
        })}
        <Button
          variant="secondary"
          onClick={() => headers.append({ name: '', value: '' })}
          className="px-2.5 py-1 text-xs"
        >
          <Plus className="size-3.5" aria-hidden />
          Add header
        </Button>
        <p className="text-xs text-slate-500">
          Secrets such as tokens are stored with the job and masked when displayed.
        </p>
      </fieldset>

      <FormField
        label="Request body"
        htmlFor="body"
        optional
        error={errors.body?.message}
        hint={method === 'GET' ? 'GET requests are sent without a body.' : 'JSON. Max 64 KB.'}
      >
        <textarea
          rows={6}
          spellCheck={false}
          disabled={method === 'GET'}
          placeholder='{ "event": "job.completed" }'
          className={codeInputClasses}
          {...describedBy('body', errors.body?.message, true)}
          {...register('body')}
        />
      </FormField>
    </div>
  );
}

/** Timeout, retry count and retry delay, with a plain-language summary. */
export function RetryPolicyFields() {
  const {
    register,
    control,
    formState: { errors },
  } = useJobDefinitionForm();
  const [maxRetries, retryDelaySeconds] = useWatch({
    control,
    name: ['maxRetries', 'retryDelaySeconds'],
  });
  const attempts = Number.isInteger(maxRetries) && maxRetries >= 0 ? maxRetries + 1 : null;

  return (
    <div className="grid gap-4">
      <div className="grid gap-5 sm:grid-cols-3">
        <FormField
          label="Timeout (seconds)"
          htmlFor="timeoutSeconds"
          error={errors.timeoutSeconds?.message}
          hint="Each attempt is stopped after this long. Max 24 h."
        >
          <input
            type="number"
            min={JOB_LIMITS.timeoutSecondsMin}
            max={JOB_LIMITS.timeoutSecondsMax}
            className={inputClasses}
            {...describedBy('timeoutSeconds', errors.timeoutSeconds?.message, true)}
            {...register('timeoutSeconds', { valueAsNumber: true })}
          />
        </FormField>
        <FormField
          label="Retry count"
          htmlFor="maxRetries"
          error={errors.maxRetries?.message}
          hint={`Extra attempts after a failure (0–${JOB_LIMITS.maxRetriesMax}).`}
        >
          <input
            type="number"
            min={0}
            max={JOB_LIMITS.maxRetriesMax}
            className={inputClasses}
            {...describedBy('maxRetries', errors.maxRetries?.message, true)}
            {...register('maxRetries', { valueAsNumber: true })}
          />
        </FormField>
        <FormField
          label="Retry delay (seconds)"
          htmlFor="retryDelaySeconds"
          error={errors.retryDelaySeconds?.message}
          hint="Wait between attempts. Max 1 h."
        >
          <input
            type="number"
            min={0}
            max={JOB_LIMITS.retryDelaySecondsMax}
            className={inputClasses}
            {...describedBy('retryDelaySeconds', errors.retryDelaySeconds?.message, true)}
            {...register('retryDelaySeconds', { valueAsNumber: true })}
          />
        </FormField>
      </div>

      {attempts !== null && Number.isFinite(retryDelaySeconds) && (
        <p className="text-sm text-slate-600" aria-live="polite">
          {attempts === 1
            ? 'The job runs once and is not retried if it fails.'
            : `Up to ${attempts} attempts in total, ${formatDuration(retryDelaySeconds * 1000)} apart.`}
        </p>
      )}
    </div>
  );
}
