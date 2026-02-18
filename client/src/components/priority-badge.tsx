import { Badge } from '@/components/ui/badge';
import { Priority } from '@/types/user-stories';

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  [Priority.CRITICAL]: {
    label: 'Critical',
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  },
  [Priority.HIGH]: {
    label: 'High',
    className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
  },
  [Priority.MEDIUM]: {
    label: 'Medium',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800',
  },
  [Priority.LOW]: {
    label: 'Low',
    className: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const config = priorityConfig[priority];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
