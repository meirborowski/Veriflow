'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PriorityBadge } from '@/components/priority-badge';
import type { ReleaseDetailSnapshotStory } from '@/types/releases';

interface SnapshotStoriesTableProps {
  stories: ReleaseDetailSnapshotStory[];
}

export function SnapshotStoriesTable({ stories }: SnapshotStoriesTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(storyId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(storyId)) {
        next.delete(storyId);
      } else {
        next.add(storyId);
      }
      return next;
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>Title</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Steps</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stories.map((story) => {
          const isExpanded = expanded.has(story.id);
          return (
            <TableRow
              key={story.id}
              className="group cursor-pointer"
              onClick={() => toggleExpand(story.id)}
            >
              <TableCell className="pr-0">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </TableCell>
              <TableCell>
                <div>
                  <span className="font-medium">{story.title}</span>
                  {isExpanded && story.steps.length > 0 && (
                    <ol className="mt-3 space-y-2">
                      {story.steps.map((step) => (
                        <li
                          key={step.id}
                          className="flex items-start gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {step.order}
                          </span>
                          <span className="text-sm text-muted-foreground leading-5">
                            {step.instruction}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </TableCell>
              <TableCell className="align-top">
                <PriorityBadge priority={story.priority} />
              </TableCell>
              <TableCell className="align-top text-muted-foreground">
                {story.steps.length}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
