'use client';

import { use, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { PriorityBadge } from '@/components/priority-badge';
import { StatusBadge } from '@/components/status-badge';
import { useProject } from '@/hooks/use-projects';
import { useStory } from '@/hooks/use-user-stories';
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
  const { data: project } = useProject(projectId);
  const { data: story, isLoading, isError, refetch } = useStory(storyId);

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
        </>
      )}
    </div>
  );
}
