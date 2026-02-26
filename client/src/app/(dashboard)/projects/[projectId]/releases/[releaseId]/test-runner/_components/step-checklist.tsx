'use client';

import { useState } from 'react';
import { Check, X, SkipForward, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StepStatus } from '@/types/test-execution';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  order: number;
  instruction: string;
}

interface StepState {
  stepId: string;
  status: StepStatus | null;
  comment: string;
}

interface StepChecklistProps {
  steps: Step[];
  stepStatuses: Map<string, StepState>;
  onMarkStep: (stepId: string, status: StepStatus, comment?: string) => void;
}

function StepRow({
  step,
  stepState,
  onMark,
}: {
  step: Step;
  stepState: StepState | undefined;
  onMark: (status: StepStatus, comment?: string) => void;
}) {
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState(stepState?.comment ?? '');
  const currentStatus = stepState?.status ?? null;

  const handleMark = (status: StepStatus) => {
    onMark(status, comment || undefined);
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-colors',
        currentStatus === StepStatus.PASS && 'border-emerald-200 bg-emerald-50',
        currentStatus === StepStatus.FAIL && 'border-red-200 bg-red-50',
        currentStatus === StepStatus.SKIPPED && 'border-slate-200 bg-slate-50',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium',
            currentStatus === StepStatus.PASS &&
              'bg-emerald-500 text-white',
            currentStatus === StepStatus.FAIL && 'bg-red-500 text-white',
            currentStatus === StepStatus.SKIPPED &&
              'bg-slate-400 text-white',
            !currentStatus && 'bg-muted text-muted-foreground',
          )}
        >
          {currentStatus === StepStatus.PASS ? (
            <Check className="h-4 w-4" />
          ) : currentStatus === StepStatus.FAIL ? (
            <X className="h-4 w-4" />
          ) : currentStatus === StepStatus.SKIPPED ? (
            <SkipForward className="h-3.5 w-3.5" />
          ) : (
            step.order
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm">{step.instruction}</p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={currentStatus === StepStatus.PASS ? 'default' : 'outline'}
            className={cn(
              'h-8 px-2',
              currentStatus === StepStatus.PASS &&
                'bg-emerald-600 hover:bg-emerald-700',
            )}
            onClick={() => handleMark(StepStatus.PASS)}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={currentStatus === StepStatus.FAIL ? 'default' : 'outline'}
            className={cn(
              'h-8 px-2',
              currentStatus === StepStatus.FAIL &&
                'bg-red-600 hover:bg-red-700',
            )}
            onClick={() => handleMark(StepStatus.FAIL)}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={
              currentStatus === StepStatus.SKIPPED ? 'default' : 'outline'
            }
            className={cn(
              'h-8 px-2',
              currentStatus === StepStatus.SKIPPED &&
                'bg-slate-500 hover:bg-slate-600',
            )}
            onClick={() => handleMark(StepStatus.SKIPPED)}
          >
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            onClick={() => setShowComment(!showComment)}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showComment && (
        <div className="mt-3 pl-10">
          <Textarea
            placeholder="Add a comment about this step..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onBlur={() => {
              if (currentStatus) {
                onMark(currentStatus, comment || undefined);
              }
            }}
            rows={2}
            className="text-sm"
          />
        </div>
      )}
    </div>
  );
}

export function StepChecklist({
  steps,
  stepStatuses,
  onMarkStep,
}: StepChecklistProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        Verification Steps ({steps.length})
      </h3>
      {steps.map((step) => (
        <StepRow
          key={step.id}
          step={step}
          stepState={stepStatuses.get(step.id)}
          onMark={(status, comment) => onMarkStep(step.id, status, comment)}
        />
      ))}
    </div>
  );
}
