import { PriorityBadge } from '@/components/priority-badge';
import { Priority } from '@/types/user-stories';
import type { ReleaseDetailSnapshotStory } from '@/types/releases';

interface ReleaseSummaryProps {
  stories: ReleaseDetailSnapshotStory[];
}

export function ReleaseSummary({ stories }: ReleaseSummaryProps) {
  const priorityCounts = stories.reduce<Record<string, number>>(
    (acc, story) => {
      acc[story.priority] = (acc[story.priority] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const totalSteps = stories.reduce(
    (sum, story) => sum + story.steps.length,
    0,
  );

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">Total Stories</p>
        <p className="mt-1 text-2xl font-semibold">{stories.length}</p>
      </div>
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">Total Steps</p>
        <p className="mt-1 text-2xl font-semibold">{totalSteps}</p>
      </div>
      <div className="col-span-2 rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">By Priority</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {Object.values(Priority).map((p) => {
            const count = priorityCounts[p] ?? 0;
            if (count === 0) return null;
            return (
              <div key={p} className="flex items-center gap-1.5">
                <PriorityBadge priority={p} />
                <span className="text-sm font-medium">{count}</span>
              </div>
            );
          })}
          {Object.keys(priorityCounts).length === 0 && (
            <span className="text-sm text-muted-foreground">\u2014</span>
          )}
        </div>
      </div>
    </div>
  );
}
