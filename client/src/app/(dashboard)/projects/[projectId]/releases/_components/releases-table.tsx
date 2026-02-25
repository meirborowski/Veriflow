'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal, Eye, Trash2 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { ReleaseStatusBadge } from '@/components/release-status-badge';
import { useDeleteRelease } from '@/hooks/use-releases';
import { ReleaseStatus, type ReleaseListItem } from '@/types/releases';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface ReleasesTableProps {
  releases: ReleaseListItem[];
  projectId: string;
}

export function ReleasesTable({ releases, projectId }: ReleasesTableProps) {
  const deleteRelease = useDeleteRelease();
  const [deleteTarget, setDeleteTarget] = useState<ReleaseListItem | null>(null);

  function handleDelete() {
    if (!deleteTarget) return;
    deleteRelease.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Stories</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Closed</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {releases.map((release) => (
            <TableRow key={release.id}>
              <TableCell>
                <Link
                  href={`/projects/${projectId}/releases/${release.id}`}
                  className="font-medium hover:underline"
                >
                  {release.name}
                </Link>
              </TableCell>
              <TableCell>
                <ReleaseStatusBadge status={release.status} />
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {release.storyCount}
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {formatDate(release.createdAt)}
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {release.closedAt ? formatDate(release.closedAt) : '\u2014'}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Open release actions menu"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/projects/${projectId}/releases/${release.id}`}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </DropdownMenuItem>
                    {release.status === ReleaseStatus.DRAFT && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(release)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
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
            <AlertDialogTitle>Delete release</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteRelease.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteRelease.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
