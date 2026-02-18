'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAddMember } from '@/hooks/use-projects';
import { UserRole } from '@/types/projects';

export function InviteMemberForm({ projectId }: { projectId: string }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.TESTER);
  const addMember = useAddMember(projectId);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    addMember.mutate(
      { email: trimmedEmail, role },
      {
        onSuccess: () => {
          setEmail('');
          setRole(UserRole.TESTER);
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-lg font-medium">Invite Member</h2>
      <div className="mt-4 flex items-end gap-2">
        <div className="flex-1 space-y-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="w-36 space-y-2">
          <Label htmlFor="invite-role">Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
            <SelectTrigger id="invite-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
              <SelectItem value={UserRole.PM}>PM</SelectItem>
              <SelectItem value={UserRole.DEVELOPER}>Developer</SelectItem>
              <SelectItem value={UserRole.TESTER}>Tester</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={addMember.isPending}>
          {addMember.isPending ? 'Inviting...' : 'Invite'}
        </Button>
      </div>
    </form>
  );
}
