import { Badge } from '@/components/ui/badge';
import { AutomationRunStatus } from '@/types/automation';

interface Config {
  label: string;
  dotColor: string;
  className: string;
}

const statusConfig: Record<AutomationRunStatus, Config> = {
  [AutomationRunStatus.QUEUED]: {
    label: 'Queued',
    dotColor: 'bg-slate-400',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  [AutomationRunStatus.CLONING]: {
    label: 'Cloning',
    dotColor: 'bg-blue-400',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  [AutomationRunStatus.INSTALLING]: {
    label: 'Installing',
    dotColor: 'bg-blue-400',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  [AutomationRunStatus.RUNNING]: {
    label: 'Running',
    dotColor: 'bg-indigo-500',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  [AutomationRunStatus.PASS]: {
    label: 'Pass',
    dotColor: 'bg-green-500',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  [AutomationRunStatus.FAIL]: {
    label: 'Fail',
    dotColor: 'bg-red-500',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  [AutomationRunStatus.ERROR]: {
    label: 'Error',
    dotColor: 'bg-red-400',
    className: 'bg-red-50 text-red-600 border-red-200',
  },
  [AutomationRunStatus.SKIPPED]: {
    label: 'Skipped',
    dotColor: 'bg-slate-300',
    className: 'bg-slate-100 text-slate-500 border-slate-200',
  },
  [AutomationRunStatus.TIMEOUT]: {
    label: 'Timeout',
    dotColor: 'bg-orange-500',
    className: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  [AutomationRunStatus.CANCELLED]: {
    label: 'Cancelled',
    dotColor: 'bg-slate-400',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

export function AutomationRunStatusBadge({ status }: { status: AutomationRunStatus }) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={config.className}>
      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </Badge>
  );
}
