'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AutomationRunStatusBadge } from '@/components/automation-run-status-badge';
import { useTests, useTriggerRun, useRunStatus } from '@/hooks/use-automation';
import { TERMINAL_STATUSES } from '@/types/automation';
import type { PlaywrightTest } from '@/types/automation';

function RunStatusRow({ runId }: { runId: string }) {
  const { data } = useRunStatus(runId);
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="font-mono text-xs text-muted-foreground">{runId.slice(0, 8)}…</span>
      {data ? <AutomationRunStatusBadge status={data.status} /> : <span className="text-muted-foreground">—</span>}
    </div>
  );
}

interface TriggerRunDialogProps {
  projectId: string;
}

export function TriggerRunDialog({ projectId }: TriggerRunDialogProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [baseUrl, setBaseUrl] = useState('');
  const [runIds, setRunIds] = useState<string[]>([]);

  const { data, isLoading } = useTests(projectId, { limit: 100 });
  const { mutate: triggerRun, isPending } = useTriggerRun(projectId);

  const tests: PlaywrightTest[] = data?.data ?? [];

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === tests.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(tests.map((t) => t.id)));
    }
  }

  function handleTrigger() {
    if (!baseUrl.trim()) return;
    triggerRun(
      {
        testIds: selected.size > 0 ? Array.from(selected) : undefined,
        baseUrl: baseUrl.trim(),
      },
      {
        onSuccess: (result) => setRunIds(result.runIds),
      },
    );
  }

  function handleClose() {
    setOpen(false);
    setSelected(new Set());
    setBaseUrl('');
    setRunIds([]);
  }

  const isRunning = runIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button>
          <Play className="mr-1.5 h-4 w-4" />
          Run Tests
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isRunning ? 'Run Progress' : 'Trigger Test Run'}</DialogTitle>
        </DialogHeader>

        {isRunning ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {runIds.length} run{runIds.length !== 1 ? 's' : ''} queued. Status updates automatically.
            </p>
            <div className="max-h-60 divide-y overflow-y-auto rounded-md border">
              {runIds.map((id) => (
                <div key={id} className="px-4 py-2">
                  <RunStatusRow runId={id} />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleClose}>Close</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="base-url">Base URL *</Label>
              <Input
                id="base-url"
                placeholder="https://staging.example.com"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Tests</Label>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {selected.size === tests.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto rounded-md border">
                {isLoading ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">Loading tests…</p>
                ) : tests.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">No tests in registry.</p>
                ) : (
                  <ul className="divide-y">
                    {tests.map((test) => (
                      <li
                        key={test.id}
                        className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-accent/50"
                        onClick={() => toggle(test.id)}
                      >
                        <Checkbox
                          checked={selected.has(test.id)}
                          onCheckedChange={() => toggle(test.id)}
                          className="mt-0.5"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{test.testName}</p>
                          <p className="truncate text-xs text-muted-foreground">{test.testFile}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {selected.size === 0 && (
                <p className="text-xs text-muted-foreground">
                  Leave empty to run all tests.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleTrigger} disabled={!baseUrl.trim() || isPending}>
                <Play className="mr-1.5 h-4 w-4" />
                {isPending ? 'Triggering…' : 'Trigger Run'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
