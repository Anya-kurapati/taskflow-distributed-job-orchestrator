import type { TaskType } from '@/types/job';

/** The task types the mock workers "know". Jobs may only run these (or HTTP webhooks). */
export const MOCK_TASK_TYPES: TaskType[] = [
  {
    type: 'email.send',
    name: 'Send email',
    description: 'Sends a templated email to one or more recipients.',
    examplePayload: { template: 'welcome', recipients: ['user@example.com'], locale: 'en' },
  },
  {
    type: 'report.generate',
    name: 'Generate report',
    description: 'Builds a usage report and stores it as a PDF.',
    examplePayload: { report: 'monthly-usage', month: '2026-11', format: 'pdf' },
  },
  {
    type: 'image.resize',
    name: 'Resize images',
    description: 'Creates resized variants of images in a storage bucket.',
    examplePayload: { bucket: 'product-images', prefix: 'new/', sizes: [256, 512, 1024] },
  },
  {
    type: 'data.sync',
    name: 'Sync data',
    description: 'Synchronises records between two registered systems.',
    examplePayload: { source: 'crm', destination: 'warehouse', entity: 'contacts' },
  },
  {
    type: 'billing.invoice',
    name: 'Issue invoices',
    description: 'Generates and sends invoices for a billing period.',
    examplePayload: { period: '2026-11', dryRun: false },
  },
  {
    type: 'cache.warm',
    name: 'Warm cache',
    description: 'Pre-computes popular search results into the cache.',
    examplePayload: { index: 'products', topQueries: 500 },
  },
];

export const isRegisteredTaskType = (type: string) =>
  MOCK_TASK_TYPES.some((taskType) => taskType.type === type);

/**
 * Progress reporting is per task type: only tasks that can measure their work
 * report it (batch sizes are known up front). Others — and HTTP webhooks —
 * don't, and the UI shows no progress bar for them.
 */
const PROGRESS_REPORTERS: Record<string, (percent: number) => string> = {
  'image.resize': (p) => `Resized ${Math.round(12 * p).toLocaleString()} of 1,200 images`,
  'data.sync': (p) => `Synced ${Math.round(84 * p).toLocaleString()} of 8,400 records`,
  'billing.invoice': (p) => `Issued ${Math.round(6.4 * p)} of 640 invoices`,
  'report.generate': (p) =>
    p < 40 ? 'Collecting usage data' : p < 75 ? 'Aggregating results' : 'Rendering PDF',
};

/** Progress message for a task at `percent`, or null if the task doesn't report progress. */
export function progressMessage(taskType: string, percent: number): string | null {
  return PROGRESS_REPORTERS[taskType]?.(percent) ?? null;
}
