import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export function SettingsSkeleton() {
  return (
    <div>
      <Skeleton className="h-4 w-64" />
      <Skeleton className="mt-4 h-8 w-48" />

      <div className="mt-8 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-20" />
      </div>

      <Separator className="my-8" />

      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>

      <Separator className="my-8" />

      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
