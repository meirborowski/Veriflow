import { Badge } from '@/components/ui/badge';
import { BugStatus } from '@/types/bugs';

const statusConfig: Record<
  BugStatus,
  { label: string; dotColor: string; className: string }
> = {
  [BugStatus.OPEN]: {
    label: 'Open',
    dotColor: 'bg-red-500',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  [BugStatus.IN_PROGRESS]: {
    label: 'In Progress',
    dotColor: 'bg-blue-500',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  [BugStatus.RESOLVED]: {
    label: 'Resolved',
    dotColor: 'bg-emerald-500',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  [BugStatus.CLOSED]: {
    label: 'Closed',
    dotColor: 'bg-slate-400',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  [BugStatus.REOPENED]: {
    label: 'Reopened',
    dotColor: 'bg-amber-500',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
};

export function BugStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as BugStatus] ?? statusConfig[BugStatus.OPEN];
  return (
    <Badge variant="outline" className={config.className}>
      <span
        className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${config.dotColor}`}
      />
      {config.label}
    </Badge>
  );
}
