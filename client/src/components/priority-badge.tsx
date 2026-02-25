import { Badge } from '@/components/ui/badge';
import { Priority } from '@/types/user-stories';

const priorityConfig: Record<Priority, { label: string; dotColor: string; className: string }> = {
  [Priority.CRITICAL]: {
    label: 'Critical',
    dotColor: 'bg-rose-500',
    className: 'bg-rose-100 text-rose-700 border-rose-200',
  },
  [Priority.HIGH]: {
    label: 'High',
    dotColor: 'bg-orange-500',
    className: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  [Priority.MEDIUM]: {
    label: 'Medium',
    dotColor: 'bg-amber-500',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  [Priority.LOW]: {
    label: 'Low',
    dotColor: 'bg-slate-400',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const config = priorityConfig[priority];
  return (
    <Badge variant="outline" className={config.className}>
      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </Badge>
  );
}
