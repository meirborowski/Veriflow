'use client';

import { Play, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTestRunner } from '@/hooks/use-test-runner';
import { PriorityBadge } from '@/components/priority-badge';
import { Priority } from '@/types/user-stories';
import { StepChecklist } from './step-checklist';
import { SubmissionPanel } from './submission-panel';
import { ProgressSidebar } from './progress-sidebar';
import { ActiveTesters } from './active-testers';

export function TestRunnerContent({ releaseId }: { releaseId: string }) {
  const runner = useTestRunner(releaseId);

  return (
    <div className="mt-6">
      {/* Connection status */}
      <div className="mb-4 flex items-center gap-2 text-sm">
        {runner.isConnected ? (
          <>
            <Wifi className="h-4 w-4 text-emerald-500" />
            <span className="text-muted-foreground">Connected</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-red-500" />
            <span className="text-muted-foreground">Disconnected</span>
          </>
        )}
        <ActiveTesters testers={runner.activeTesters} />
      </div>

      <div className="flex gap-6">
        {/* Main area */}
        <div className="flex-1 min-w-0">
          {runner.state === 'idle' && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
              <div className="rounded-full bg-muted p-4">
                <Play className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-medium">Ready to test</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Request work to get assigned a story.
              </p>
              <Button
                className="mt-4"
                onClick={runner.requestWork}
                disabled={!runner.isConnected}
              >
                <Play className="mr-2 h-4 w-4" />
                Request Work
              </Button>
            </div>
          )}

          {runner.state === 'executing' && runner.currentStory && (
            <div className="space-y-6">
              {/* Story header */}
              <div className="rounded-lg border p-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">
                    {runner.currentStory.releaseStory.title}
                  </h2>
                  <PriorityBadge
                    priority={
                      runner.currentStory.releaseStory.priority as Priority
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    Attempt #{runner.currentStory.attempt}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {runner.currentStory.releaseStory.description}
                </p>
              </div>

              {/* Steps */}
              <StepChecklist
                steps={runner.currentStory.releaseStory.steps}
                stepStatuses={runner.stepStatuses}
                onMarkStep={runner.markStep}
              />

              {/* Submission */}
              <SubmissionPanel onSubmit={runner.submitResult} />
            </div>
          )}

          {runner.state === 'pool-empty' && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
              <h3 className="text-lg font-medium">All stories assigned</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No more stories available. Check back when testers finish
                their work.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={runner.requestWork}
                disabled={!runner.isConnected}
              >
                Retry
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-72 shrink-0">
          <ProgressSidebar releaseId={releaseId} summary={runner.summary} />
        </div>
      </div>
    </div>
  );
}
