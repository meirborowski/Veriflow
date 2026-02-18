'use client';

import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface StepInput {
  id?: string;
  instruction: string;
}

interface StepBuilderProps {
  steps: StepInput[];
  onChange: (steps: StepInput[]) => void;
}

export function StepBuilder({ steps, onChange }: StepBuilderProps) {
  function addStep() {
    onChange([...steps, { instruction: '' }]);
  }

  function removeStep(index: number) {
    if (steps.length <= 1) return;
    onChange(steps.filter((_, i) => i !== index));
  }

  function updateInstruction(index: number, instruction: string) {
    const updated = steps.map((step, i) =>
      i === index ? { ...step, instruction } : step,
    );
    onChange(updated);
  }

  return (
    <div className="space-y-3">
      <Label>Verification Steps</Label>
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="flex h-9 w-8 shrink-0 items-center justify-center text-sm text-muted-foreground">
              <GripVertical className="h-4 w-4 opacity-30" />
              {index + 1}.
            </div>
            <Input
              placeholder={`Step ${index + 1} instruction...`}
              value={step.instruction}
              onChange={(e) => updateInstruction(index, e.target.value)}
              required
              maxLength={2000}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeStep(index)}
              disabled={steps.length <= 1}
              aria-label={`Remove step ${index + 1}`}
              title={steps.length <= 1 ? 'At least one step is required' : `Remove step ${index + 1}`}
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addStep}>
        <Plus className="mr-1.5 h-4 w-4" />
        Add Step
      </Button>
    </div>
  );
}
