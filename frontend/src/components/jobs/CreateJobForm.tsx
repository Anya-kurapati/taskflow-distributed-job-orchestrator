import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Card } from '@/components/ui/Card';
import { describedBy, inputClasses } from '@/components/ui/form-styles';
import { FormField } from '@/components/ui/FormField';
import { ROUTES } from '@/constants/routes';
import { applyServerFieldErrors, CREATE_JOB_FIELD_MAP } from '@/utils/apiFieldErrors';
import { createJobFormSchema, type CreateJobFormValues } from '@/schemas/createJobForm.schema';
import type { CreateJobRequest } from '@/types/job';
import { CREATE_JOB_DEFAULTS, toCreateJobRequest } from '@/utils/createJobRequest';

import { JobBasicsFields, JobTargetFields, RetryPolicyFields } from './JobDefinitionFields';

interface CreateJobFormProps {
  onSubmit: (request: CreateJobRequest) => Promise<unknown>;
  isSubmitting?: boolean;
  submitError?: string | null;
}

export function CreateJobForm({ onSubmit, isSubmitting = false, submitError }: CreateJobFormProps) {
  const form = useForm<CreateJobFormValues>({
    resolver: zodResolver(createJobFormSchema),
    defaultValues: CREATE_JOB_DEFAULTS,
    mode: 'onTouched',
  });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = form;
  const runMode = useWatch({ control, name: 'runMode' });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toCreateJobRequest(values));
    } catch (error) {
      // Keep the user's input. Field-level server errors go under their inputs;
      // the parent shows the overall message via `submitError`.
      applyServerFieldErrors(error, form.setError, CREATE_JOB_FIELD_MAP);
    }
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate className="space-y-6">
        <JobBasicsFields />
        <JobTargetFields />

        <Card title="Execution">
          <div className="grid gap-6">
            <fieldset>
              <legend className="text-sm font-medium text-slate-700">When to run</legend>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                {(
                  [
                    ['NOW', 'Run immediately'],
                    ['SCHEDULED', 'Schedule for later'],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      value={value}
                      className="size-4 accent-indigo-600"
                      {...register('runMode')}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {runMode === 'SCHEDULED' && (
                <FormField
                  label="Run at"
                  htmlFor="scheduledAt"
                  error={errors.scheduledAt?.message}
                  hint="Your local time. For recurring runs, create a schedule instead."
                  className="mt-3 max-w-sm"
                >
                  <input
                    type="datetime-local"
                    className={inputClasses}
                    {...describedBy('scheduledAt', errors.scheduledAt?.message, true)}
                    {...register('scheduledAt')}
                  />
                </FormField>
              )}
            </fieldset>
            <RetryPolicyFields />
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            <Plus className="size-4" aria-hidden />
            {isSubmitting ? 'Creating…' : 'Create job'}
          </Button>
          <ButtonLink to={ROUTES.JOBS} variant="secondary">
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
