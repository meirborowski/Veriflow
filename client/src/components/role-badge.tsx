import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/types/projects';

const roleVariant: Record<UserRole, 'default' | 'secondary' | 'outline'> = {
  [UserRole.ADMIN]: 'default',
  [UserRole.PM]: 'secondary',
  [UserRole.DEVELOPER]: 'outline',
  [UserRole.TESTER]: 'outline',
};

const roleLabel: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.PM]: 'PM',
  [UserRole.DEVELOPER]: 'Developer',
  [UserRole.TESTER]: 'Tester',
};

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge variant={roleVariant[role]}>{roleLabel[role]}</Badge>;
}
