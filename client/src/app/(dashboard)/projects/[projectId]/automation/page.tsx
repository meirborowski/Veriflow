'use client';

import { use, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Bot, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useTests, useDeleteTest } from '@/hooks/use-automation';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { TriggerRunDialog } from './_components/trigger-run-dialog';

const PAGE_SIZE = 20;

function TestsTableSkeleton() {
  return (
    <div className="mt-4 space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function AutomationPageContent({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId);
  const { get, getNumber, set, setPage } = useUrlFilters();
  const page = getNumber('page', 1);

  const [search, setSearch] = useState(get('search'));
  const [debouncedSearch, setDebouncedSearch] = useState(get('search'));
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      if (search !== get('search')) set({ search: search || null });
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, refetch } = useTests(projectId, {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });

  const { mutate: deleteTest } = useDeleteTest();

  return (
    <div className="max-w-5xl">
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: project?.name ?? '...', href: `/projects/${projectId}` },
          { label: 'Automation' },
        ]}
      />

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Automation</h1>
        <TriggerRunDialog projectId={projectId} />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Input
          placeholder="Search tests..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="outline" size="sm" asChild>
          <Link href={`/projects/${projectId}/automation/runs`}>View Runs</Link>
        </Button>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <TestsTableSkeleton />
        ) : isError ? (
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">Failed to load tests.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : data && data.data.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Name</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Last Synced</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell>
                      <Link
                        href={`/projects/${projectId}/automation/${test.id}`}
                        className="font-medium hover:underline"
                      >
                        {test.testName}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {test.testFile}
                    </TableCell>
                    <TableCell>
                      {test.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {test.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {test.lastSyncedAt
                        ? new Date(test.lastSyncedAt).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(test.id)}
                        title="Delete test"
                      >
                        <Trash2 className="h-4 w-4" />
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
              <Bot className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-lg font-medium">No tests in registry</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Push your Playwright test catalog via the registry sync API.
            </p>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete test?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the test from the registry. Existing run history is preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) deleteTest(deleteId);
                setDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AutomationPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  return (
    <Suspense fallback={<div className="max-w-5xl"><TestsTableSkeleton /></div>}>
      <AutomationPageContent projectId={projectId} />
    </Suspense>
  );
}
