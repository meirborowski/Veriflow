'use client';

import { useState, useEffect } from 'react';
import { Link2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useTests, useLinkTests } from '@/hooks/use-automation';

interface LinkTestDialogProps {
  storyId: string;
  projectId: string;
  linkedTestIds: string[];
}

export function LinkTestDialog({ storyId, projectId, linkedTestIds }: LinkTestDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const linkedSet = new Set(linkedTestIds);
  const { data, isLoading } = useTests(projectId, { search: search || undefined, limit: 50 });
  const { mutate: linkTests, isPending } = useLinkTests(storyId);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setSelected(new Set());
    }
  }, [open]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    if (selected.size === 0) return;
    linkTests(Array.from(selected), {
      onSuccess: () => setOpen(false),
    });
  }

  const availableTests = (data?.data ?? []).filter((t) => !linkedSet.has(t.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link2 className="mr-1.5 h-4 w-4" />
          Link Test
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Link Tests to Story</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="max-h-72 overflow-y-auto rounded-md border">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : availableTests.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {search ? 'No tests match your search.' : 'No unlinked tests found.'}
            </div>
          ) : (
            <ul className="divide-y">
              {availableTests.map((test) => (
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

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selected.size === 0 || isPending}>
            Link {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
