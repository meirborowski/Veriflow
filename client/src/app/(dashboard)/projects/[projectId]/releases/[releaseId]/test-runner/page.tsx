'use client';

import { use } from 'react';
import { AlertCircle } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { useProject } from '@/hooks/use-projects';
import { useRelease } from '@/hooks/use-releases';
import { ReleaseStatus } from '@/types/releases';
import { SocketProvider } from '@/context/socket-context';
import { TestRunnerContent } from './_components/test-runner-content';

export default function TestRunnerPage({
  params,
}: {
  params: Promise<{ projectId: string; releaseId: string }>;
}) {
  const { projectId, releaseId } = use(params);
  const { data: project } = useProject(projectId);
  const { data: release, isLoading } = useRelease(releaseId);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (!release || release.status !== ReleaseStatus.CLOSED) {
    return (
      <div className="mt-16 flex flex-col items-center justify-center text-center">
        <div className="rounded-full bg-muted p-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-medium">Test runner unavailable</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The release must be closed before running tests.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: project?.name ?? '...', href: `/projects/${projectId}` },
          {
            label: 'Releases',
            href: `/projects/${projectId}/releases`,
          },
          {
            label: release.name,
            href: `/projects/${projectId}/releases/${releaseId}`,
          },
          { label: 'Test Runner' },
        ]}
      />

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Test Runner &mdash; {release.name}
      </h1>

      <SocketProvider>
        <TestRunnerContent releaseId={releaseId} />
      </SocketProvider>
    </div>
  );
}
