'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Button } from '@/components/ui/button';
import { useDeleteProject } from '@/hooks/use-projects';

interface DeleteProjectSectionProps {
  projectId: string;
  projectName: string;
}

export function DeleteProjectSection({ projectId, projectName }: DeleteProjectSectionProps) {
  const router = useRouter();
  const deleteProject = useDeleteProject();
  const [open, setOpen] = useState(false);

  function handleDelete() {
    deleteProject.mutate(projectId, {
      onSuccess: () => {
        setOpen(false);
        router.push('/projects');
      },
    });
  }

  return (
    <div className="rounded-lg border border-destructive/50 p-6">
      <h2 className="text-lg font-medium text-destructive">Danger Zone</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Permanently delete this project and all of its data. This action cannot be undone.
      </p>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="mt-4">
            Delete Project
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{projectName}&quot;? All data will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteProject.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteProject.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
