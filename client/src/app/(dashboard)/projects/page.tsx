'use client';

import { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/pagination';
import { useProjects } from '@/hooks/use-projects';
import { CreateProjectDialog } from './_components/create-project-dialog';
import { ProjectsTable } from './_components/projects-table';
import { ProjectsTableSkeleton } from './_components/projects-table-skeleton';

const PAGE_SIZE = 20;

export default function ProjectsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useProjects(page, PAGE_SIZE);

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <CreateProjectDialog />
      </div>

      <div className="mt-6">
        {isLoading ? (
          <ProjectsTableSkeleton />
        ) : isError ? (
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">Failed to load projects.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : data && data.data.length > 0 ? (
          <>
            <ProjectsTable projects={data.data} />
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
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-lg font-medium">No projects yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first project to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
