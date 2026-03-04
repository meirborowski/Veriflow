'use client';

import { use, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronRight, Pencil, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { PriorityBadge } from '@/components/priority-badge';
import { StatusBadge } from '@/components/status-badge';
import { AutomationRunStatusBadge } from '@/components/automation-run-status-badge';
import { ConflictIndicator } from '@/components/conflict-indicator';
import { LinkTestDialog } from '@/components/link-test-dialog';
import { useProject } from '@/hooks/use-projects';
import { useStory } from '@/hooks/use-user-stories';
import { useAutomationSummary, useUnlinkTest } from '@/hooks/use-automation';
import { AttachmentList } from '@/components/attachment-list';
import { StoryDetailSkeleton } from './_components/story-detail-skeleton';
import { EditStoryForm } from './_components/edit-story-form';

export default function StoryDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; storyId: string }>;
}) {
  const { projectId, storyId } = use(params);
  const searchParams = useSearchParams();
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true');
  const [autoExpanded, setAutoExpanded] = useState(false);
  const { data: project } = useProject(projectId);
  const { data: story, isLoading, isError, refetch } = useStory(storyId);
  const { data: automationSummary } = useAutomationSummary(storyId);
  const { mutate: unlinkTest } = useUnlinkTest(storyId);

  if (isLoading) return <StoryDetailSkeleton />;

  if (isError || !story) {
    return (
      <div className="mt-16 flex flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">
          Failed to load story.
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

  return (
    <div className="max-w-4xl">
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: project?.name ?? '...', href: `/projects/${projectId}` },
          {
            label: 'Stories',
            href: `/projects/${projectId}/stories`,
          },
          { label: story.title },
        ]}
      />

      {isEditing ? (
        <div className="mt-6">
          <h1 className="text-2xl font-semibold tracking-tight">Edit Story</h1>
          <div className="mt-4">
            <EditStoryForm story={story} onCancel={() => setIsEditing(false)} />
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">
              {story.title}
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="mr-1.5 h-4 w-4" />
              Edit
            </Button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <PriorityBadge priority={story.priority} />
            <StatusBadge status={story.status} />
          </div>

          <p className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap">
            {story.description}
          </p>

          <div className="mt-8">
            <h2 className="text-lg font-medium">
              Verification Steps ({story.steps.length})
            </h2>
            <ol className="mt-4 space-y-3 border-l-2 border-muted pl-4">
              {story.steps.map((step) => (
                <li key={step.id} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {step.order}
                  </span>
                  <span className="text-sm leading-6">{step.instruction}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-8 rounded-md border">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              onClick={() => setAutoExpanded((p) => !p)}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  Automation ({automationSummary?.tests.length ?? 0})
                </span>
                {automationSummary?.hasConflict && <ConflictIndicator />}
              </div>
              {autoExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {autoExpanded && (
              <div className="border-t px-4 pb-4 pt-3">
                {automationSummary && automationSummary.tests.length > 0 ? (
                  <ul className="divide-y rounded-md border">
                    {automationSummary.tests.map((t) => (
                      <li key={t.id} className="flex items-center justify-between px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{t.testName}</p>
                          <p className="truncate font-mono text-xs text-muted-foreground">
                            {t.testFile}
                          </p>
                        </div>
                        <div className="ml-3 flex shrink-0 items-center gap-2">
                          {t.latestRunStatus ? (
                            <AutomationRunStatusBadge status={t.latestRunStatus} />
                          ) : (
                            <span className="text-xs text-muted-foreground">No runs</span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => unlinkTest(t.id)}
                            title="Unlink test"
                          >
                            <Unlink className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No tests linked yet.</p>
                )}
                <div className="mt-3">
                  <LinkTestDialog
                    storyId={storyId}
                    projectId={projectId}
                    linkedTestIds={automationSummary?.tests.map((t) => t.id) ?? []}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-8">
            <AttachmentList entityType="story" entityId={storyId} />
          </div>
        </>
      )}
    </div>
  );
}
