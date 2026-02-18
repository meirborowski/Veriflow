'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateStory } from '@/hooks/use-user-stories';
import { Priority, StoryStatus, type StoryDetail } from '@/types/user-stories';
import {
  StepBuilder,
  type StepInput,
} from '../../_components/step-builder';

interface EditStoryFormProps {
  story: StoryDetail;
  onCancel: () => void;
}

export function EditStoryForm({ story, onCancel }: EditStoryFormProps) {
  const updateStory = useUpdateStory(story.id);
  const [title, setTitle] = useState(story.title);
  const [description, setDescription] = useState(story.description);
  const [priority, setPriority] = useState<Priority>(story.priority);
  const [status, setStatus] = useState<StoryStatus>(story.status);
  const [steps, setSteps] = useState<StepInput[]>(
    story.steps.map((s) => ({ id: s.id, instruction: s.instruction })),
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    if (!trimmedTitle || !trimmedDescription) return;

    const validSteps = steps.filter((s) => s.instruction.trim());
    if (validSteps.length === 0) return;

    updateStory.mutate(
      {
        title: trimmedTitle,
        description: trimmedDescription,
        priority,
        status,
        steps: validSteps.map((s, i) => ({
          id: s.id,
          order: i + 1,
          instruction: s.instruction.trim(),
        })),
      },
      {
        onSuccess: () => {
          onCancel();
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="edit-story-title">Title</Label>
        <Input
          id="edit-story-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={255}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-story-description">Description</Label>
        <Textarea
          id="edit-story-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          maxLength={5000}
          rows={4}
        />
      </div>

      <div className="flex gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-story-priority">Priority</Label>
          <Select
            value={priority}
            onValueChange={(value) => setPriority(value as Priority)}
          >
            <SelectTrigger id="edit-story-priority" className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(Priority).map((p) => (
                <SelectItem key={p} value={p}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-story-status">Status</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as StoryStatus)}
          >
            <SelectTrigger id="edit-story-status" className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(StoryStatus).map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <StepBuilder steps={steps} onChange={setSteps} />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={updateStory.isPending}>
          {updateStory.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
