'use client';

import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface SortableHeaderProps {
  label: string;
  column: string;
  currentOrderBy: string;
  currentSortDir: string;
  onSort: (column: string, dir: string) => void;
  className?: string;
}

export function SortableHeader({
  label,
  column,
  currentOrderBy,
  currentSortDir,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentOrderBy === column;

  function handleClick() {
    if (isActive && currentSortDir === 'ASC') {
      onSort(column, 'DESC');
    } else if (isActive && currentSortDir === 'DESC') {
      onSort('', '');
    } else {
      onSort(column, 'ASC');
    }
  }

  return (
    <TableHead
      className={cn('cursor-pointer select-none', className)}
      onClick={handleClick}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && currentSortDir === 'ASC' ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : isActive && currentSortDir === 'DESC' ? (
          <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
      </span>
    </TableHead>
  );
}
