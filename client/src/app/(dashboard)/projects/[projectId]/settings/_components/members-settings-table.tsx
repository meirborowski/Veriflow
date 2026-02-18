'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { RoleBadge } from '@/components/role-badge';
import { useUpdateMemberRole, useRemoveMember } from '@/hooks/use-projects';
import { UserRole, type ProjectMember } from '@/types/projects';
import { Trash2 } from 'lucide-react';

interface MembersSettingsTableProps {
  projectId: string;
  members: ProjectMember[];
  currentUserId: string;
}

export function MembersSettingsTable({
  projectId,
  members,
  currentUserId,
}: MembersSettingsTableProps) {
  const updateRole = useUpdateMemberRole(projectId);
  const removeMember = useRemoveMember(projectId);
  const [removeTarget, setRemoveTarget] = useState<ProjectMember | null>(null);

  function handleRoleChange(userId: string, newRole: UserRole) {
    updateRole.mutate({ userId, role: newRole });
  }

  function handleRemove() {
    if (!removeTarget) return;
    removeMember.mutate(removeTarget.userId, {
      onSuccess: () => setRemoveTarget(null),
    });
  }

  return (
    <>
      <h2 className="text-lg font-medium">Members</h2>
      <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isSelf = member.userId === currentUserId;
              return (
                <TableRow key={member.userId}>
                  <TableCell className="font-medium">
                    {member.name}
                    {isSelf && (
                      <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{member.email}</TableCell>
                  <TableCell>
                    {isSelf ? (
                      <RoleBadge role={member.role} />
                    ) : (
                      <Select
                        value={member.role}
                        onValueChange={(v) => handleRoleChange(member.userId, v as UserRole)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                          <SelectItem value={UserRole.PM}>PM</SelectItem>
                          <SelectItem value={UserRole.DEVELOPER}>Developer</SelectItem>
                          <SelectItem value={UserRole.TESTER}>Tester</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {!isSelf && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setRemoveTarget(member)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removeTarget?.name} from this project?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {removeMember.isPending ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
