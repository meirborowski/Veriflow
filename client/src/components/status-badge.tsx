import { Badge } from '@/components/ui/badge';
import { StoryStatus } from '@/types/user-stories';

const statusConfig: Record<StoryStatus, { label: string; className: string }> = {
  [StoryStatus.DRAFT]: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  },
  [StoryStatus.ACTIVE]: {
    label: 'Active',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  },
  [StoryStatus.DEPRECATED]: {
    label: 'Deprecated',
    className: 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900 dark:text-gray-500 dark:border-gray-700',
  },
};

export function StatusBadge({ status }: { status: StoryStatus }) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
