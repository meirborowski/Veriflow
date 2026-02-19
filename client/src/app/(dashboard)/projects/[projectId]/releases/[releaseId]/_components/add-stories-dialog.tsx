'use client';

import { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { PriorityBadge } from '@/components/priority-badge';
import { useStories } from '@/hooks/use-user-stories';
import { useAddStoriesToRelease } from '@/hooks/use-releases';

interface AddStoriesDialogProps {
  releaseId: string;
  projectId: string;
  scopedStoryIds: string[];
}

export function AddStoriesDialog({
  releaseId,
  projectId,
  scopedStoryIds,
}: AddStoriesDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const addStories = useAddStoriesToRelease(releaseId);

  const { data } = useStories(projectId, { limit: 100 });

  const availableStories = useMemo(() => {
    if (!data) return [];
    const scopedSet = new Set(scopedStoryIds);
    return data.data.filter((story) => !scopedSet.has(story.id));
  }, [data, scopedStoryIds]);

  const filteredStories = useMemo(() => {
    if (!search.trim()) return availableStories;
    const term = search.toLowerCase();
    return availableStories.filter((story) =>
      story.title.toLowerCase().includes(term),
    );
  }, [availableStories, search]);

  function toggleStory(storyId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(storyId)) {
        next.delete(storyId);
      } else {
        next.add(storyId);
      }
      return next;
    });
  }

  function handleSubmit() {
    if (selected.size === 0) return;
    addStories.mutate(
      { storyIds: Array.from(selected) },
      {
        onSuccess: () => {
          setOpen(false);
          setSelected(new Set());
          setSearch('');
        },
      },
    );
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSelected(new Set());
      setSearch('');
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Stories
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Stories to Release</DialogTitle>
          <DialogDescription>
            Select stories from this project to include in the release scope.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search stories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="max-h-64 overflow-y-auto border rounded-md">
          {filteredStories.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              {availableStories.length === 0
                ? 'All stories are already in this release.'
                : 'No stories match your search.'}
            </p>
          ) : (
            <ul className="divide-y">
              {filteredStories.map((story) => (
                <li key={story.id}>
                  <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50">
                    <Checkbox
                      checked={selected.has(story.id)}
                      onCheckedChange={() => toggleStory(story.id)}
                    />
                    <span className="flex-1 text-sm font-medium truncate">
                      {story.title}
                    </span>
                    <PriorityBadge priority={story.priority} />
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={selected.size === 0 || addStories.isPending}
          >
            {addStories.isPending
              ? 'Adding...'
              : `Add ${selected.size} ${selected.size === 1 ? 'Story' : 'Stories'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
