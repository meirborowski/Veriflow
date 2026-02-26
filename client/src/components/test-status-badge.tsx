import { Badge } from '@/components/ui/badge';
import { TestStatus } from '@/types/test-execution';

const statusConfig: Record<
  TestStatus,
  { label: string; dotColor: string; className: string }
> = {
  [TestStatus.UNTESTED]: {
    label: 'Untested',
    dotColor: 'bg-slate-400',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  [TestStatus.IN_PROGRESS]: {
    label: 'In Progress',
    dotColor: 'bg-blue-500',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  [TestStatus.PASS]: {
    label: 'Pass',
    dotColor: 'bg-emerald-500',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  [TestStatus.FAIL]: {
    label: 'Fail',
    dotColor: 'bg-red-500',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  [TestStatus.PARTIALLY_TESTED]: {
    label: 'Partial',
    dotColor: 'bg-amber-500',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  [TestStatus.CANT_BE_TESTED]: {
    label: "Can't Test",
    dotColor: 'bg-slate-300',
    className: 'bg-slate-200 text-slate-500 border-slate-200',
  },
};

export function TestStatusBadge({ status }: { status: TestStatus }) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={config.className}>
      <span
        className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${config.dotColor}`}
      />
      {config.label}
    </Badge>
  );
}
