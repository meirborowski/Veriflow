import { Badge } from '@/components/ui/badge';
import { ReleaseStatus } from '@/types/releases';

const releaseStatusConfig: Record<ReleaseStatus, { label: string; className: string }> = {
  [ReleaseStatus.DRAFT]: {
    label: 'Draft',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  },
  [ReleaseStatus.CLOSED]: {
    label: 'Closed',
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  },
};

export function ReleaseStatusBadge({ status }: { status: ReleaseStatus }) {
  const config = releaseStatusConfig[status];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
