'use client';

import { use } from 'react';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ReleaseStatusBadge } from '@/components/release-status-badge';
import { useProject } from '@/hooks/use-projects';
import { useRelease } from '@/hooks/use-releases';
import { ReleaseStatus } from '@/types/releases';
import type {
  ReleaseDetailDraftStory,
  ReleaseDetailSnapshotStory,
} from '@/types/releases';
import { ReleaseDetailSkeleton } from './_components/release-detail-skeleton';
import { DraftStoriesTable } from './_components/draft-stories-table';
import { SnapshotStoriesTable } from './_components/snapshot-stories-table';
import { AddStoriesDialog } from './_components/add-stories-dialog';
import { CloseReleaseDialog } from './_components/close-release-dialog';
import { ReleaseSummary } from './_components/release-summary';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ReleaseDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; releaseId: string }>;
}) {
  const { projectId, releaseId } = use(params);
  const { data: project } = useProject(projectId);
  const { data: release, isLoading, isError, refetch } = useRelease(releaseId);

  if (isLoading) return <ReleaseDetailSkeleton />;

  if (isError || !release) {
    return (
      <div className="mt-16 flex flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">
          Failed to load release.
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
    );
  }

  const isDraft = release.status === ReleaseStatus.DRAFT;
  const storyCount = release.stories.length;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: project?.name ?? '...', href: `/projects/${projectId}` },
          {
            label: 'Releases',
            href: `/projects/${projectId}/releases`,
          },
          { label: release.name },
        ]}
      />

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {release.name}
        </h1>
        {isDraft && (
          <div className="flex items-center gap-2">
            <AddStoriesDialog
              releaseId={releaseId}
              projectId={projectId}
              scopedStoryIds={release.stories.map((s) => s.id)}
            />
            <CloseReleaseDialog
              releaseId={releaseId}
              disabled={storyCount === 0}
            />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <ReleaseStatusBadge status={release.status} />
        <span className="text-sm text-muted-foreground">
          Created {formatDate(release.createdAt)}
          {release.closedAt && ` \u00b7 Closed ${formatDate(release.closedAt)}`}
        </span>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium">
          Stories ({storyCount})
        </h2>

        {storyCount === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-medium">No stories in scope</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add stories to this release to define the test scope.
            </p>
          </div>
        ) : isDraft ? (
          <div className="mt-4">
            <DraftStoriesTable
              stories={release.stories as ReleaseDetailDraftStory[]}
              releaseId={releaseId}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            <ReleaseSummary
              stories={release.stories as ReleaseDetailSnapshotStory[]}
            />
            <SnapshotStoriesTable
              stories={release.stories as ReleaseDetailSnapshotStory[]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
