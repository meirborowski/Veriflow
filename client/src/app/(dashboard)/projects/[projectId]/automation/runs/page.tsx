'use client';

import { use, Suspense } from 'react';
import Link from 'next/link';
import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Pagination } from '@/components/pagination';
import { AutomationRunStatusBadge } from '@/components/automation-run-status-badge';
import { useProject } from '@/hooks/use-projects';
import { useRuns } from '@/hooks/use-automation';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { AutomationRunStatus } from '@/types/automation';

const PAGE_SIZE = 20;

const ALL_STATUSES = Object.values(AutomationRunStatus);

function RunsTableSkeleton() {
  return (
    <div className="mt-4 space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function RunsPageContent({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId);
  const { get, getNumber, set, setPage } = useUrlFilters();
  const page = getNumber('page', 1);
  const status = get('status');
  const testId = get('testId');

  const { data, isLoading, isError, refetch } = useRuns(projectId, {
    page,
    limit: PAGE_SIZE,
    status: status || undefined,
    testId: testId || undefined,
  });

  return (
    <div className="max-w-5xl">
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: project?.name ?? '...', href: `/projects/${projectId}` },
          { label: 'Automation', href: `/projects/${projectId}/automation` },
          { label: 'Runs' },
        ]}
      />

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Runs</h1>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Select
          value={status || 'ALL'}
          onValueChange={(v) => set({ status: v === 'ALL' ? null : v, page: null })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {testId && (
          <Button variant="outline" size="sm" onClick={() => set({ testId: null })}>
            Clear test filter
          </Button>
        )}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <RunsTableSkeleton />
        ) : isError ? (
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">Failed to load runs.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : data && data.data.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      <AutomationRunStatusBadge status={run.status} />
                    </TableCell>
                    <TableCell className="text-sm capitalize text-muted-foreground">
                      {run.triggeredBy.toLowerCase().replace('_', ' ')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDuration(run.duration)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(run.startedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/projects/${projectId}/automation/runs/${run.id}`}>
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data.meta.totalPages > 1 && (
              <div className="mt-4">
                <Pagination
                  page={data.meta.page}
                  totalPages={data.meta.totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        ) : (
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-4">
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-lg font-medium">No runs yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Trigger a run from the automation page to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RunsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  return (
    <Suspense fallback={<div className="max-w-5xl"><RunsTableSkeleton /></div>}>
      <RunsPageContent projectId={projectId} />
    </Suspense>
  );
}
