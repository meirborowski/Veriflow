'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TestStatus, BugSeverity } from '@/types/test-execution';
import { cn } from '@/lib/utils';

const VERDICT_OPTIONS = [
  {
    value: TestStatus.PASS,
    label: 'Pass',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  },
  {
    value: TestStatus.FAIL,
    label: 'Fail',
    color: 'bg-red-100 text-red-700 border-red-300',
  },
  {
    value: TestStatus.PARTIALLY_TESTED,
    label: 'Partial',
    color: 'bg-amber-100 text-amber-700 border-amber-300',
  },
  {
    value: TestStatus.CANT_BE_TESTED,
    label: "Can't Test",
    color: 'bg-slate-100 text-slate-600 border-slate-300',
  },
];

interface SubmissionPanelProps {
  onSubmit: (
    status: TestStatus,
    comment?: string,
    bug?: { title: string; description: string; severity: string },
  ) => void;
}

export function SubmissionPanel({ onSubmit }: SubmissionPanelProps) {
  const [verdict, setVerdict] = useState<TestStatus | null>(null);
  const [comment, setComment] = useState('');
  const [bugTitle, setBugTitle] = useState('');
  const [bugDescription, setBugDescription] = useState('');
  const [bugSeverity, setBugSeverity] = useState<BugSeverity>(
    BugSeverity.MAJOR,
  );

  const showBugForm = verdict === TestStatus.FAIL;

  const handleSubmit = () => {
    if (!verdict) return;

    const bug =
      showBugForm && bugTitle
        ? {
            title: bugTitle,
            description: bugDescription,
            severity: bugSeverity,
          }
        : undefined;

    onSubmit(verdict, comment || undefined, bug);
  };

  return (
    <div className="rounded-lg border p-6">
      <h3 className="text-sm font-medium text-muted-foreground">
        Final Verdict
      </h3>

      <div className="mt-3 flex gap-2">
        {VERDICT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setVerdict(option.value)}
            className={cn(
              'rounded-md border px-4 py-2 text-sm font-medium transition-all',
              verdict === option.value
                ? option.color + ' ring-2 ring-offset-1 ring-current'
                : 'border-muted bg-background text-muted-foreground hover:bg-muted',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <Label htmlFor="exec-comment" className="text-sm">
          Comment (optional)
        </Label>
        <Textarea
          id="exec-comment"
          placeholder="Add notes about this test execution..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          className="mt-1"
        />
      </div>

      {showBugForm && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
          <h4 className="text-sm font-medium text-red-700">
            Report Bug (optional)
          </h4>
          <div>
            <Label htmlFor="bug-title" className="text-sm">
              Title
            </Label>
            <Input
              id="bug-title"
              placeholder="Short bug summary..."
              value={bugTitle}
              onChange={(e) => setBugTitle(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="bug-desc" className="text-sm">
              Description
            </Label>
            <Textarea
              id="bug-desc"
              placeholder="Describe the issue..."
              value={bugDescription}
              onChange={(e) => setBugDescription(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="bug-severity" className="text-sm">
              Severity
            </Label>
            <Select
              value={bugSeverity}
              onValueChange={(v) => setBugSeverity(v as BugSeverity)}
            >
              <SelectTrigger id="bug-severity" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BugSeverity.CRITICAL}>Critical</SelectItem>
                <SelectItem value={BugSeverity.MAJOR}>Major</SelectItem>
                <SelectItem value={BugSeverity.MINOR}>Minor</SelectItem>
                <SelectItem value={BugSeverity.TRIVIAL}>Trivial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button onClick={handleSubmit} disabled={!verdict}>
          <Send className="mr-2 h-4 w-4" />
          Submit Result
        </Button>
      </div>
    </div>
  );
}
