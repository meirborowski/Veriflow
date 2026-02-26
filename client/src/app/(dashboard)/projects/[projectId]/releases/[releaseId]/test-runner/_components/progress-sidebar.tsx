'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TestStatusBadge } from '@/components/test-status-badge';
import { TestStatus, type DashboardSummary } from '@/types/test-execution';
import { useLatestExecutions } from '@/hooks/use-test-executions';

interface ProgressSidebarProps {
  releaseId: string;
  summary: DashboardSummary | null;
}

export function ProgressSidebar({ releaseId, summary }: ProgressSidebarProps) {
  const { data } = useLatestExecutions(releaseId);
  const displaySummary = summary ?? data?.summary;
  const stories = data?.stories ?? [];

  if (!displaySummary) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tested =
    displaySummary.total -
    displaySummary.untested -
    displaySummary.inProgress;
  const percentage =
    displaySummary.total > 0
      ? Math.round((tested / displaySummary.total) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {tested} of {displaySummary.total} tested
            </span>
            <span className="font-medium">{percentage}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary counts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pass</span>
              <span className="font-medium text-emerald-600">
                {displaySummary.pass}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Fail</span>
              <span className="font-medium text-red-600">
                {displaySummary.fail}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Partial</span>
              <span className="font-medium text-amber-600">
                {displaySummary.partiallyTested}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">In Progress</span>
              <span className="font-medium text-blue-600">
                {displaySummary.inProgress}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Untested</span>
              <span className="font-medium">{displaySummary.untested}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Can&apos;t Test</span>
              <span className="font-medium">{displaySummary.cantBeTested}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-story list */}
      {stories.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stories.map((story) => (
                <div
                  key={story.releaseStoryId}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate text-sm">{story.storyTitle}</span>
                  <TestStatusBadge
                    status={story.latestStatus as TestStatus}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
