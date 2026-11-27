import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarClock, Repeat, Save } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';

import {
  JobBasicsFields,
  JobTargetFields,
  RetryPolicyFields,
} from '@/components/jobs/JobDefinitionFields';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Card } from '@/components/ui/Card';
import { codeInputClasses, describedBy, inputClasses } from '@/components/ui/form-styles';
import { FormField } from '@/components/ui/FormField';
import { ROUTES } from '@/constants/routes';
import { applyServerFieldErrors, SCHEDULE_FIELD_MAP } from '@/utils/apiFieldErrors';
import { CRON_PRESETS, CRON_PREVIEW_COUNT } from '@/constants/schedules';
import { scheduleFormSchema, type ScheduleFormValues } from '@/schemas/scheduleForm.schema';
import type { ScheduleRequest } from '@/types/schedule';
import { listTimeZones, localTimeZone, nextCronRuns, validateCronExpression } from '@/utils/cron';
import { formatInTimeZone } from '@/utils/format';
import { toScheduleRequest } from '@/utils/scheduleRequest';

interface ScheduleFormProps {
  defaultValues: ScheduleFormValues;
  submitLabel: string;
  onSubmit: (request: ScheduleRequest) => Promise<unknown>;
  isSubmitting?: boolean;
  submitError?: string | null;
}

export function ScheduleForm({
  defaultValues,
  submitLabel,
  onSubmit,
  isSubmitting = false,
  submitError,
}: ScheduleFormProps) {
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues,
    mode: 'onTouched',
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(toScheduleRequest(values));
    } catch (error) {
      // Keep the user's input. Field-level server errors go under their inputs;
      // the parent shows the overall message via `submitError`.
      applyServerFieldErrors(error, form.setError, SCHEDULE_FIELD_MAP);
    }
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate className="space-y-6">
        <JobBasicsFields nameLabel="Schedule name" />
        <TriggerFields />
        <JobTargetFields />
        <Card title="Job settings" description="Applied to every job this schedule creates.">
          <RetryPolicyFields />
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="size-4" aria-hidden />
            {isSubmitting ? 'Saving…' : submitLabel}
          </Button>
          <ButtonLink to={ROUTES.SCHEDULES} variant="secondary">
            Cancel
          </ButtonLink>
          {submitError && (
            <p role="alert" className="text-sm text-red-600">
              {submitError}
            </p>
          )}
        </div>
      </form>
    </FormProvider>
  );
}

function TriggerFields() {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<ScheduleFormValues>();
  const triggerType = useWatch<ScheduleFormValues, 'triggerType'>({ name: 'triggerType' });
  const timezone = useWatch<ScheduleFormValues, 'timezone'>({ name: 'timezone' });
  const allTimeZones = useMemo(() => listTimeZones(), []);
  // The browser may report an alias (e.g. Asia/Calcutta) missing from the canonical
  // list; include the current value so the select never silently shows another zone.
  const timeZones = allTimeZones.includes(timezone) ? allTimeZones : [timezone, ...allTimeZones];

  return (
    <Card
      title="Schedule"
      description="Run the job once at a set time, or repeatedly on a cron schedule."
    >
      <fieldset>
        <legend className="sr-only">Schedule type</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <TriggerOption
            value="ONCE"
            icon={<CalendarClock className="size-5" aria-hidden />}
            title="One time"
            description="Run once at a specific date and time."
          />
          <TriggerOption
            value="CRON"
            icon={<Repeat className="size-5" aria-hidden />}
            title="Recurring"
            description="Repeat on a cron schedule."
          />
        </div>
      </fieldset>

      <div className="mt-5">
        {triggerType === 'ONCE' ? (
          <FormField
            label="Run at"
            htmlFor="runAt"
            error={errors.runAt?.message}
            hint={`Your local time (${localTimeZone()}).`}
            className="max-w-sm"
          >
            <input
              type="datetime-local"
              className={inputClasses}
              {...describedBy('runAt', errors.runAt?.message, true)}
              {...register('runAt')}
            />
          </FormField>
        ) : (
          <div className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Preset" htmlFor="cronPreset" hint="Fills in the expression below.">
                <select
                  id="cronPreset"
                  className={inputClasses}
                  aria-describedby="cronPreset-hint"
                  value=""
                  onChange={(event) => {
                    if (event.target.value) {
                      setValue('cron', event.target.value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }
                  }}
                >
                  <option value="">Choose a preset…</option>
                  {CRON_PRESETS.map((preset) => (
                    <option key={preset.expression} value={preset.expression}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Timezone" htmlFor="timezone" error={errors.timezone?.message}>
                <select
                  className={inputClasses}
                  {...describedBy('timezone', errors.timezone?.message)}
                  {...register('timezone')}
                >
                  {timeZones.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField
              label="Cron expression"
              htmlFor="cron"
              error={errors.cron?.message}
              hint="minute  hour  day-of-month  month  day-of-week — e.g. 0 9 * * 1-5"
            >
              <input
                spellCheck={false}
                autoComplete="off"
                className={codeInputClasses}
                {...describedBy('cron', errors.cron?.message, true)}
                {...register('cron')}
              />
            </FormField>

            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-indigo-600"
                {...register('skipIfRunning')}
              />
              <span>
                Skip a run if the previous job is still waiting or running
                <span className="block text-xs text-slate-500">
                  Prevents jobs from piling up when a run takes longer than the interval.
                </span>
              </span>
            </label>

            <CronPreview />
          </div>
        )}
      </div>
    </Card>
  );
}

function TriggerOption({
  value,
  icon,
  title,
  description,
}: {
  value: ScheduleFormValues['triggerType'];
  icon: ReactNode;
  title: string;
  description: string;
}) {
  const { register } = useFormContext<ScheduleFormValues>();
  return (
    <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:border-slate-300 has-checked:border-indigo-500 has-checked:bg-indigo-50/50 has-checked:ring-1 has-checked:ring-indigo-500 has-focus-visible:outline-2 has-focus-visible:outline-indigo-600">
      <input type="radio" value={value} className="sr-only" {...register('triggerType')} />
      <span className="text-indigo-600">{icon}</span>
      <span>
        <span className="block text-sm font-medium text-slate-900">{title}</span>
        <span className="block text-xs text-slate-500">{description}</span>
      </span>
    </label>
  );
}

/** Next few run times for the expression being typed, computed locally as a preview. */
function CronPreview() {
  const [cron, timezone] = useWatch<ScheduleFormValues, ['cron', 'timezone']>({
    name: ['cron', 'timezone'],
  });
  const problem = validateCronExpression(cron, timezone);
  const runs = problem ? [] : nextCronRuns(cron, timezone, CRON_PREVIEW_COUNT);
  const showLocal = timezone !== localTimeZone();

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4" aria-live="polite">
      <h3 className="text-sm font-medium text-slate-900">Next {CRON_PREVIEW_COUNT} runs</h3>
      {problem ? (
        <p className="mt-1 text-sm text-slate-500">
          Enter a valid expression to preview run times.
        </p>
      ) : (
        <ol aria-label="Upcoming run times" className="mt-2 space-y-1 text-sm text-slate-700">
          {runs.map((run) => (
            <li key={run.toISOString()} className="tabular-nums">
              {formatInTimeZone(run, timezone)}
              {showLocal && (
                <span className="ml-2 text-xs text-slate-500">
                  ({formatInTimeZone(run, localTimeZone())} your time)
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
