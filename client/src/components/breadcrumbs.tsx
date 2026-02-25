'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            {item.href && !isLast ? (
              <Link href={item.href} className="truncate hover:text-foreground transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={`truncate ${isLast ? 'text-foreground font-medium' : ''}`}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
