'use client';

import { Users } from 'lucide-react';

interface ActiveTestersProps {
  testers: Set<string>;
}

export function ActiveTesters({ testers }: ActiveTestersProps) {
  const count = testers.size;

  if (count === 0) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className="mx-2 text-muted-foreground/50">|</span>
      <Users className="h-4 w-4" />
      <span>
        {count} tester{count !== 1 ? 's' : ''} online
      </span>
    </div>
  );
}
