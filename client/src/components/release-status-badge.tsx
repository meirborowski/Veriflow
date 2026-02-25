import { Badge } from '@/components/ui/badge';
import { ReleaseStatus } from '@/types/releases';

const releaseStatusConfig: Record<ReleaseStatus, { label: string; dotColor: string; className: string }> = {
  [ReleaseStatus.DRAFT]: {
    label: 'Draft',
    dotColor: 'bg-blue-500',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  [ReleaseStatus.CLOSED]: {
    label: 'Closed',
    dotColor: 'bg-emerald-500',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
};

export function ReleaseStatusBadge({ status }: { status: ReleaseStatus }) {
  const config = releaseStatusConfig[status];
  return (
    <Badge variant="outline" className={config.className}>
      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </Badge>
  );
}
