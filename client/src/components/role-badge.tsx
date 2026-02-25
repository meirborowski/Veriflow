import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/types/projects';

const roleConfig: Record<UserRole, { label: string; className: string }> = {
  [UserRole.ADMIN]: {
    label: 'Admin',
    className: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  [UserRole.PM]: {
    label: 'PM',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  [UserRole.DEVELOPER]: {
    label: 'Developer',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  [UserRole.TESTER]: {
    label: 'Tester',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
};

export function RoleBadge({ role }: { role: UserRole }) {
  const config = roleConfig[role];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
