import { Skeleton } from '@/components/ui/skeleton';

export function StoryDetailSkeleton() {
  return (
    <div>
      <Skeleton className="h-4 w-64" />
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-16 w-full" />

      <div className="mt-8">
        <Skeleton className="h-6 w-40" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
