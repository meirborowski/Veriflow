'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AutomationRunStatusBadge } from '@/components/automation-run-status-badge';
import { useProject } from '@/hooks/use-projects';
import { useTest } from '@/hooks/use-automation';

function TestDetailSkeleton() {
  return (
    <div className="max-w-4xl space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function TestDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; testId: string }>;
}) {
  const { projectId, testId } = use(params);
  const { data: project } = useProject(projectId);
  const { data, isLoading, isError, refetch } = useTest(testId);

  if (isLoading) return <TestDetailSkeleton />;

  if (isError || !data) {
    return (
      <div className="mt-16 flex flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">Failed to load test.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const { test, linkedStories, recentRuns } = data;

  return (
    <div className="max-w-4xl">
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: project?.name ?? '...', href: `/projects/${projectId}` },
          { label: 'Automation', href: `/projects/${projectId}/automation` },
          { label: test.testName },
        ]}
      />

      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight">{test.testName}</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">{test.testFile}</p>
      </div>

      {test.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {test.tags.map((tag) => (
            <span key={tag} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-medium">Linked Stories ({linkedStories.length})</h2>
        {linkedStories.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No stories linked to this test.</p>
        ) : (
          <ul className="mt-3 divide-y rounded-md border">
            {linkedStories.map((story) => (
              <li key={story.id}>
                <Link
                  href={`/projects/${story.projectId}/stories/${story.id}`}
                  className="block px-4 py-3 text-sm font-medium hover:bg-accent/50"
                >
                  {story.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Recent Runs ({recentRuns.length})</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${projectId}/automation/runs?testId=${testId}`}>
              View all runs
            </Link>
          </Button>
        </div>
        {recentRuns.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No runs yet.</p>
        ) : (
          <Table className="mt-3">
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
              {recentRuns.map((run) => (
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
        )}
      </div>
    </div>
  );
}
