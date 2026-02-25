import { Badge } from '@/components/ui/badge';
import { StoryStatus } from '@/types/user-stories';

const statusConfig: Record<StoryStatus, { label: string; dotColor: string; className: string }> = {
  [StoryStatus.DRAFT]: {
    label: 'Draft',
    dotColor: 'bg-slate-400',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  [StoryStatus.ACTIVE]: {
    label: 'Active',
    dotColor: 'bg-blue-500',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  [StoryStatus.DEPRECATED]: {
    label: 'Deprecated',
    dotColor: 'bg-slate-300',
    className: 'bg-slate-200 text-slate-500 border-slate-200',
  },
};

export function StatusBadge({ status }: { status: StoryStatus }) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={config.className}>
      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </Badge>
  );
}
