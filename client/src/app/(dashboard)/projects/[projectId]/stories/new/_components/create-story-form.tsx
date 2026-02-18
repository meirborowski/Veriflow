'use client';

import { useState, useRef, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
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
import { useCreateStory } from '@/hooks/use-user-stories';
import { Priority } from '@/types/user-stories';
import {
  StepBuilder,
  type StepInput,
} from '../../_components/step-builder';

export function CreateStoryForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const createStory = useCreateStory(projectId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [steps, setSteps] = useState<StepInput[]>([{ instruction: '' }]);
  const [stepError, setStepError] = useState('');
  const stepBuilderRef = useRef<HTMLDivElement>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStepError('');
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    if (!trimmedTitle || !trimmedDescription) return;

    const validSteps = steps.filter((s) => s.instruction.trim());
    if (validSteps.length === 0) {
      setStepError('At least one verification step is required.');
      stepBuilderRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    createStory.mutate(
      {
        title: trimmedTitle,
        description: trimmedDescription,
        priority,
        steps: validSteps.map((s, i) => ({
          order: i + 1,
          instruction: s.instruction.trim(),
        })),
      },
      {
        onSuccess: () => {
          router.push(`/projects/${projectId}/stories`);
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="story-title">Title</Label>
        <Input
          id="story-title"
          placeholder="e.g. User can log in with email and password"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={255}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="story-description">Description</Label>
        <Textarea
          id="story-description"
          placeholder="Describe what this story covers and any prerequisites..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          maxLength={5000}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="story-priority">Priority</Label>
        <Select
          value={priority}
          onValueChange={(value) => setPriority(value as Priority)}
        >
          <SelectTrigger id="story-priority" className="w-[200px]">
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

      <div ref={stepBuilderRef}>
        <StepBuilder steps={steps} onChange={(s) => { setSteps(s); setStepError(''); }} />
        {stepError && (
          <p className="mt-1 text-sm text-destructive">{stepError}</p>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/projects/${projectId}/stories`)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={createStory.isPending}>
          {createStory.isPending ? 'Creating...' : 'Create Story'}
        </Button>
      </div>
    </form>
  );
}
