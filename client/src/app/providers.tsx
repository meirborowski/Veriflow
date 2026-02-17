'use client';

import { type ReactNode } from 'react';
import { QueryProvider } from '@/lib/query-provider';
import { AuthProvider } from '@/context/auth-context';
import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        {children}
        <Toaster position="bottom-right" />
      </AuthProvider>
    </QueryProvider>
  );
}
