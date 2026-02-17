'use client';

import { FolderOpen } from 'lucide-react';

export default function ProjectsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
      <div className="mt-16 flex flex-col items-center justify-center text-center">
        <div className="rounded-full bg-muted p-4">
          <FolderOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-lg font-medium">No projects yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first project to get started.
        </p>
      </div>
    </div>
  );
}
