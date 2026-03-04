'use client';

import { use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { AutomationRunStatusBadge } from '@/components/automation-run-status-badge';
import { useProject } from '@/hooks/use-projects';
import { useRun } from '@/hooks/use-automation';

function RunDetailSkeleton() {
  return (
    <div className="max-w-4xl space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function RunDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; runId: string }>;
}) {
  const { projectId, runId } = use(params);
  const { data: project } = useProject(projectId);
  const { data: run, isLoading, isError, refetch } = useRun(runId);

  if (isLoading) return <RunDetailSkeleton />;

  if (isError || !run) {
    return (
      <div className="mt-16 flex flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">Failed to load run.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: project?.name ?? '...', href: `/projects/${projectId}` },
          { label: 'Automation', href: `/projects/${projectId}/automation` },
          { label: 'Runs', href: `/projects/${projectId}/automation/runs` },
          { label: run.id.slice(0, 8) },
        ]}
      />

      <div className="mt-4 flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Run Detail</h1>
        <AutomationRunStatusBadge status={run.status} />
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Trigger
          </dt>
          <dd className="mt-1 text-sm capitalize">
            {run.triggeredBy.toLowerCase().replace('_', ' ')}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Duration
          </dt>
          <dd className="mt-1 text-sm">{formatDuration(run.duration)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Started
          </dt>
          <dd className="mt-1 text-sm">{new Date(run.startedAt).toLocaleString()}</dd>
        </div>
        {run.completedAt && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Completed
            </dt>
            <dd className="mt-1 text-sm">{new Date(run.completedAt).toLocaleString()}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Test
          </dt>
          <dd className="mt-1 text-sm">
            <Link
              href={`/projects/${projectId}/automation/${run.testId}`}
              className="text-sm hover:underline"
            >
              {run.testId.slice(0, 8)}…
            </Link>
          </dd>
        </div>
      </dl>

      {run.errorMessage && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-destructive">Error</h2>
          <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-4 text-xs">
            {run.errorMessage}
          </pre>
        </div>
      )}

      {run.logs && (
        <div className="mt-6">
          <h2 className="text-sm font-medium">Logs</h2>
          <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs leading-relaxed">
            {run.logs}
          </pre>
        </div>
      )}
    </div>
  );
}
