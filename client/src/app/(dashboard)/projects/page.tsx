'use client';

import { Suspense, useState, useEffect } from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/pagination';
import { useProjects } from '@/hooks/use-projects';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { CreateProjectDialog } from './_components/create-project-dialog';
import { ProjectsTable } from './_components/projects-table';
import { ProjectsTableSkeleton } from './_components/projects-table-skeleton';

const PAGE_SIZE = 20;

function ProjectsPageContent() {
  const { get, getNumber, set, setPage } = useUrlFilters();
  const page = getNumber('page', 1);
  const orderBy = get('orderBy');
  const sortDir = get('sortDir');

  const [search, setSearch] = useState(get('search'));
  const [debouncedSearch, setDebouncedSearch] = useState(get('search'));

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      if (search !== get('search')) {
        set({ search: search || null });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError, refetch } = useProjects({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    orderBy: orderBy || undefined,
    sortDir: sortDir || undefined,
  });

  function handleSort(column: string, dir: string) {
    set({ orderBy: column || null, sortDir: dir || null });
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <CreateProjectDialog />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
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
            <ProjectsTable
              projects={data.data}
              orderBy={orderBy}
              sortDir={sortDir}
              onSort={handleSort}
            />
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

export default function ProjectsPage() {
  return (
    <Suspense fallback={<ProjectsTableSkeleton />}>
      <ProjectsPageContent />
    </Suspense>
  );
}
