import { Badge } from '@/components/ui/badge';
import { BugSeverity } from '@/types/bugs';

const severityConfig: Record<
  BugSeverity,
  { label: string; dotColor: string; className: string }
> = {
  [BugSeverity.CRITICAL]: {
    label: 'Critical',
    dotColor: 'bg-rose-500',
    className: 'bg-rose-100 text-rose-700 border-rose-200',
  },
  [BugSeverity.MAJOR]: {
    label: 'Major',
    dotColor: 'bg-orange-500',
    className: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  [BugSeverity.MINOR]: {
    label: 'Minor',
    dotColor: 'bg-amber-500',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  [BugSeverity.TRIVIAL]: {
    label: 'Trivial',
    dotColor: 'bg-slate-400',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

export function BugSeverityBadge({ severity }: { severity: string }) {
  const config = severityConfig[severity as BugSeverity] ?? severityConfig[BugSeverity.TRIVIAL];
  return (
    <Badge variant="outline" className={config.className}>
      <span
        className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${config.dotColor}`}
      />
      {config.label}
    </Badge>
  );
}
