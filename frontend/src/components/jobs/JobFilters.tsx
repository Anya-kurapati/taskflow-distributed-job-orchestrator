import { Search, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { inputClasses } from '@/components/ui/form-styles';
import { HTTP_WEBHOOK_TYPE, JOB_STATUSES } from '@/constants/jobs';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useTaskTypes } from '@/hooks/useJobs';
import type { JobSort, JobStatus } from '@/types/job';
import { cn } from '@/utils/cn';
import { toTitleCase } from '@/utils/format';
import { hasActiveFilters, type JobListQuery } from '@/utils/jobListQuery';

const SEARCH_DEBOUNCE_MS = 300;

interface JobFiltersProps {
  query: JobListQuery;
  onChange: (changes: Partial<JobListQuery>) => void;
  onClear: () => void;
}

const selectClasses = cn(inputClasses, 'w-auto py-1.5 pr-8');

export function JobFilters({ query, onChange, onClear }: JobFiltersProps) {
  const taskTypes = useTaskTypes();
  // Remount the search box when filters are cleared so its text resets too.
  const [searchKey, setSearchKey] = useState(0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchBox
        key={searchKey}
        initialValue={query.search}
        onSearch={(search) => onChange({ search })}
      />

      <label className="sr-only" htmlFor="status-filter">
        Status
      </label>
      <select
        id="status-filter"
        value={query.status}
        onChange={(event) => onChange({ status: event.target.value as JobStatus | '' })}
        className={selectClasses}
      >
        <option value="">All statuses</option>
        {JOB_STATUSES.map((status) => (
          <option key={status} value={status}>
            {toTitleCase(status)}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="type-filter">
        Job type
      </label>
      <select
        id="type-filter"
        value={query.type}
        onChange={(event) => onChange({ type: event.target.value })}
        className={selectClasses}
      >
        <option value="">All types</option>
        <option value={HTTP_WEBHOOK_TYPE}>HTTP webhook</option>
        {taskTypes.data?.map((taskType) => (
          <option key={taskType.type} value={taskType.type}>
            {taskType.name}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="sort-order">
        Sort by
      </label>
      <select
        id="sort-order"
        value={query.sort}
        onChange={(event) => onChange({ sort: event.target.value as JobSort })}
        className={selectClasses}
      >
        <option value="createdAt:desc">Newest first</option>
        <option value="createdAt:asc">Oldest first</option>
      </select>

      {hasActiveFilters(query) && (
        <Button
          variant="ghost"
          onClick={() => {
            setSearchKey((key) => key + 1);
            onClear();
          }}
          className="px-2.5 py-1.5"
        >
          <X className="size-4" aria-hidden />
          Clear filters
        </Button>
      )}
    </div>
  );
}

function SearchBox({
  initialValue,
  onSearch,
}: {
  initialValue: string;
  onSearch: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const debouncedSearch = useDebouncedCallback(onSearch, SEARCH_DEBOUNCE_MS);

  return (
    <div className="relative min-w-48 flex-1 sm:max-w-xs">
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
      <input
        type="search"
        aria-label="Search jobs by name"
        placeholder="Search by name…"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          debouncedSearch(event.target.value);
        }}
        className={cn(inputClasses, 'py-1.5 pl-8')}
      />
    </div>
  );
}
