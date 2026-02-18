'use client';

import { use } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { useProject } from '@/hooks/use-projects';
import { CreateStoryForm } from './_components/create-story-form';

export default function NewStoryPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { data: project } = useProject(projectId);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: project?.name ?? '...', href: `/projects/${projectId}` },
          {
            label: 'Stories',
            href: `/projects/${projectId}/stories`,
          },
          { label: 'New Story' },
        ]}
      />

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        New Story
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create a user story with verification steps that testers will execute.
      </p>

      <div className="mt-6">
        <CreateStoryForm projectId={projectId} />
      </div>
    </div>
  );
}
