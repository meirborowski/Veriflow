'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useCloseRelease } from '@/hooks/use-releases';

interface CloseReleaseDialogProps {
  releaseId: string;
  disabled: boolean;
}

export function CloseReleaseDialog({
  releaseId,
  disabled,
}: CloseReleaseDialogProps) {
  const [open, setOpen] = useState(false);
  const closeRelease = useCloseRelease(releaseId);

  function handleClose() {
    closeRelease.mutate(undefined, {
      onSuccess: () => setOpen(false),
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button disabled={disabled}>
          <Lock className="mr-1.5 h-4 w-4" />
          Close Release
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close release</AlertDialogTitle>
          <AlertDialogDescription>
            This will freeze the scope and create immutable snapshots of all
            stories and their steps. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClose}
            disabled={closeRelease.isPending}
          >
            {closeRelease.isPending ? 'Closing...' : 'Close Release'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
