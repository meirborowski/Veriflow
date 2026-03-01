'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bug as BugIcon, MoreHorizontal, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Pagination } from '@/components/pagination';
import { BugSeverityBadge } from '@/components/bug-severity-badge';
import { BugStatusBadge } from '@/components/bug-status-badge';
import { useProject } from '@/hooks/use-projects';
import { useBugs, useDeleteBug } from '@/hooks/use-bugs';
import { BugSeverity, BugStatus } from '@/types/bugs';
import type { BugListItem } from '@/types/bugs';

const PAGE_SIZE = 20;

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function BugsTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Story</TableHead>
          <TableHead>Reporter</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
            <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-8 w-8" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function BugsTable({
  bugs,
  projectId,
}: {
  bugs: BugListItem[];
  projectId: string;
}) {
  const router = useRouter();
  const deleteBug = useDeleteBug(projectId);
  const [deleteTarget, setDeleteTarget] = useState<BugListItem | null>(null);

  function handleDelete() {
    if (!deleteTarget) return;
    deleteBug.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Story</TableHead>
            <TableHead>Reporter</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {bugs.map((bug) => (
            <TableRow key={bug.id}>
              <TableCell>
                <Link
                  href={`/projects/${projectId}/bugs/${bug.id}`}
                  className="font-medium hover:underline"
                >
                  {bug.title}
                </Link>
              </TableCell>
              <TableCell>
                <BugSeverityBadge severity={bug.severity} />
              </TableCell>
              <TableCell>
                <BugStatusBadge status={bug.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {bug.storyTitle}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {bug.reportedByName}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {bug.assignedToName ?? '\u2014'}
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {formatDate(bug.createdAt)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Open bug actions menu"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(`/projects/${projectId}/bugs/${bug.id}`)
                      }
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteTarget(bug)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bug</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteBug.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteBug.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function BugsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { data: project } = useProject(projectId);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [severity, setSeverity] = useState<string>('');

  const { data, isLoading, isError, refetch } = useBugs(projectId, {
    page,
    limit: PAGE_SIZE,
    status: status || undefined,
    severity: severity || undefined,
  });

  return (
    <div className="max-w-6xl">
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: project?.name ?? '...', href: `/projects/${projectId}` },
          { label: 'Bugs' },
        ]}
      />

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Bugs</h1>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value === 'ALL' ? '' : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {Object.values(BugStatus).map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'IN_PROGRESS'
                  ? 'In Progress'
                  : s.charAt(0) + s.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={severity}
          onValueChange={(value) => {
            setSeverity(value === 'ALL' ? '' : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Severities</SelectItem>
            {Object.values(BugSeverity).map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <BugsTableSkeleton />
        ) : isError ? (
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">
              Failed to load bugs.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => refetch()}
            >
              Try again
            </Button>
          </div>
        ) : data && data.data.length > 0 ? (
          <>
            <BugsTable bugs={data.data} projectId={projectId} />
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
              <BugIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-lg font-medium">No bugs found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Bugs are automatically created when test executions fail.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
