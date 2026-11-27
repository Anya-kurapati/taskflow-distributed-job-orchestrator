import { useNavigate } from 'react-router';

import { PageHeader } from '@/components/common/PageHeader';
import { CreateJobForm } from '@/components/jobs/CreateJobForm';
import { jobDetailsPath } from '@/constants/routes';
import { useCreateJob } from '@/hooks/useJobs';
import type { CreateJobRequest } from '@/types/job';

export function CreateJobPage() {
  const navigate = useNavigate();
  const createJob = useCreateJob();

  const handleSubmit = async (request: CreateJobRequest) => {
    const job = await createJob.mutateAsync(request);
    await navigate(jobDetailsPath(job.id));
  };

  return (
    <>
      <PageHeader
        title="Create job"
        description="Define what to run, when to run it and how failures are retried."
      />
      <div className="max-w-4xl">
        <CreateJobForm
          onSubmit={handleSubmit}
          isSubmitting={createJob.isPending}
          submitError={createJob.error?.message}
        />
      </div>
    </>
  );
}
