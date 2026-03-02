'use client';

import { use, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Pagination } from '@/components/pagination';
import { useProject } from '@/hooks/use-projects';
import { useStories } from '@/hooks/use-user-stories';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { Priority, StoryStatus } from '@/types/user-stories';
import { StoriesTable } from './_components/stories-table';
import { StoriesTableSkeleton } from './_components/stories-table-skeleton';

const PAGE_SIZE = 20;

function StoriesPageContent({
  projectId,
}: {
  projectId: string;
}) {
  const { data: project } = useProject(projectId);
  const { get, getNumber, set, setPage } = useUrlFilters();
  const page = getNumber('page', 1);
  const status = get('status');
  const priority = get('priority');
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

  const { data, isLoading, isError, refetch } = useStories(projectId, {
    page,
    limit: PAGE_SIZE,
    status: status || undefined,
    priority: priority || undefined,
    search: debouncedSearch || undefined,
    orderBy: orderBy || undefined,
    sortDir: sortDir || undefined,
  });

  function handleSort(column: string, dir: string) {
    set({ orderBy: column || null, sortDir: dir || null });
  }

  return (
    <div className="max-w-6xl">
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: project?.name ?? '...', href: `/projects/${projectId}` },
          { label: 'Stories' },
        ]}
      />

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">User Stories</h1>
        <Button asChild>
          <Link href={`/projects/${projectId}/stories/new`}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Story
          </Link>
        </Button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Input
          placeholder="Search stories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={status || 'ALL'}
          onValueChange={(value) => {
            set({ status: value === 'ALL' ? null : value });
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {Object.values(StoryStatus).map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={priority || 'ALL'}
          onValueChange={(value) => {
            set({ priority: value === 'ALL' ? null : value });
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priorities</SelectItem>
            {Object.values(Priority).map((p) => (
              <SelectItem key={p} value={p}>
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <StoriesTableSkeleton />
        ) : isError ? (
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">
              Failed to load stories.
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
            <StoriesTable
              stories={data.data}
              projectId={projectId}
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
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-lg font-medium">No stories yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first user story to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StoriesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  return (
    <Suspense fallback={<StoriesTableSkeleton />}>
      <StoriesPageContent projectId={projectId} />
    </Suspense>
  );
}
