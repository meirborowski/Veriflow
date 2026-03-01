'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Separator } from '@/components/ui/separator';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { BugSeverityBadge } from '@/components/bug-severity-badge';
import { BugStatusBadge } from '@/components/bug-status-badge';
import { useProject } from '@/hooks/use-projects';
import { useBug, useUpdateBug, useDeleteBug } from '@/hooks/use-bugs';
import { BugSeverity, BugStatus } from '@/types/bugs';

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function BugDetailSkeleton() {
  return (
    <div className="max-w-4xl">
      <Skeleton className="h-4 w-64" />
      <Skeleton className="mt-4 h-8 w-96" />
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-6 h-24 w-full" />
      <Skeleton className="mt-6 h-48 w-full" />
    </div>
  );
}

export default function BugDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; bugId: string }>;
}) {
  const { projectId, bugId } = use(params);
  const router = useRouter();
  const { data: project } = useProject(projectId);
  const { data: bug, isLoading, isError, refetch } = useBug(bugId);
  const updateBug = useUpdateBug(bugId);
  const deleteBug = useDeleteBug(projectId);
  const [showDelete, setShowDelete] = useState(false);

  if (isLoading) return <BugDetailSkeleton />;

  if (isError || !bug) {
    return (
      <div className="mt-16 flex flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">Failed to load bug.</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  function handleDelete() {
    deleteBug.mutate(bugId, {
      onSuccess: () => {
        router.push(`/projects/${projectId}/bugs`);
      },
    });
  }

  return (
    <div className="max-w-4xl">
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: project?.name ?? '...', href: `/projects/${projectId}` },
          { label: 'Bugs', href: `/projects/${projectId}/bugs` },
          { label: bug.title },
        ]}
      />

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{bug.title}</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDelete(true)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          Delete
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <BugSeverityBadge severity={bug.severity} />
        <BugStatusBadge status={bug.status} />
      </div>

      <Separator className="my-6" />

      {/* Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Status
          </label>
          <Select
            value={bug.status}
            onValueChange={(value) => updateBug.mutate({ status: value })}
            disabled={updateBug.isPending}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(BugStatus).map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'IN_PROGRESS'
                    ? 'In Progress'
                    : s.charAt(0) + s.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Severity
          </label>
          <Select
            value={bug.severity}
            onValueChange={(value) => updateBug.mutate({ severity: value })}
            disabled={updateBug.isPending}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(BugSeverity).map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Assignee
          </label>
          <Select
            value={bug.assignedToId ?? 'UNASSIGNED'}
            onValueChange={(value) =>
              updateBug.mutate({
                assignedToId: value === 'UNASSIGNED' ? null : value,
              })
            }
            disabled={updateBug.isPending}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
              {project?.members.map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
        <div>
          <span className="text-muted-foreground">Reporter</span>
          <p className="mt-0.5 font-medium">{bug.reportedBy.name}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Linked Story</span>
          <p className="mt-0.5">
            <Link
              href={`/projects/${projectId}/stories/${bug.storyId}`}
              className="font-medium hover:underline"
            >
              {bug.story.title}
            </Link>
          </p>
        </div>
        {bug.execution && (
          <div>
            <span className="text-muted-foreground">Execution</span>
            <p className="mt-0.5 font-medium">
              Attempt #{bug.execution.attempt}
            </p>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Created</span>
          <p className="mt-0.5 font-medium">{formatDateTime(bug.createdAt)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Updated</span>
          <p className="mt-0.5 font-medium">{formatDateTime(bug.updatedAt)}</p>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Description */}
      <div>
        <h2 className="text-lg font-medium">Description</h2>
        <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
          {bug.description}
        </p>
      </div>

      {/* Delete dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bug</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{bug.title}&quot;? This
              action cannot be undone.
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
    </div>
  );
}
