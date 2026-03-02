'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

export interface UrlFilterState {
  [key: string]: string;
}

export function useUrlFilters(defaults: Record<string, string> = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const get = useCallback(
    (key: string): string => {
      return searchParams.get(key) ?? defaults[key] ?? '';
    },
    [searchParams, defaults],
  );

  const getNumber = useCallback(
    (key: string, fallback: number): number => {
      const val = searchParams.get(key);
      if (!val) return fallback;
      const num = parseInt(val, 10);
      return isNaN(num) ? fallback : num;
    },
    [searchParams],
  );

  const set = useCallback(
    (updates: Record<string, string | null>, resetPage = true) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      if (resetPage && !('page' in updates)) {
        params.delete('page');
      }

      const query = params.toString();
      router.push(`${pathname}${query ? `?${query}` : ''}`);
    },
    [searchParams, router, pathname],
  );

  const setPage = useCallback(
    (page: number) => {
      set({ page: page > 1 ? String(page) : null }, false);
    },
    [set],
  );

  return { get, getNumber, set, setPage };
}
