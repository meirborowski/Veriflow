'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { PriorityBadge } from '@/components/priority-badge';
import { useRemoveStoryFromRelease } from '@/hooks/use-releases';
import type { ReleaseDetailDraftStory } from '@/types/releases';

interface DraftStoriesTableProps {
  stories: ReleaseDetailDraftStory[];
  releaseId: string;
}

export function DraftStoriesTable({
  stories,
  releaseId,
}: DraftStoriesTableProps) {
  const removeStory = useRemoveStoryFromRelease(releaseId);
  const [removeTarget, setRemoveTarget] =
    useState<ReleaseDetailDraftStory | null>(null);

  function handleRemove() {
    if (!removeTarget) return;
    removeStory.mutate(removeTarget.id, {
      onSuccess: () => setRemoveTarget(null),
    });
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Steps</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {stories.map((story) => (
            <TableRow key={story.id}>
              <TableCell className="font-medium">{story.title}</TableCell>
              <TableCell>
                <PriorityBadge priority={story.priority} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {story.stepCount}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setRemoveTarget(story)}
                  aria-label={`Remove ${story.title} from release`}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove story from release</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &quot;{removeTarget?.title}&quot;
              from this release? You can add it back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removeStory.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {removeStory.isPending ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
