'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateProject } from '@/hooks/use-projects';

interface ProjectDetailsFormProps {
  projectId: string;
  initialName: string;
  initialDescription: string | null;
}

export function ProjectDetailsForm({
  projectId,
  initialName,
  initialDescription,
}: ProjectDetailsFormProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? '');
  const updateProject = useUpdateProject(projectId);

  const hasChanges = name !== initialName || description !== (initialDescription ?? '');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    updateProject.mutate({
      name: trimmedName,
      description: description.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-lg font-medium">Project Details</h2>
      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="settings-name">Name</Label>
          <Input
            id="settings-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={255}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="settings-description">Description</Label>
          <Textarea
            id="settings-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={3}
          />
        </div>
        <Button type="submit" disabled={!hasChanges || updateProject.isPending}>
          {updateProject.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
