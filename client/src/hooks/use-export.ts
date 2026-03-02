'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { getAccessToken } from '@/lib/api';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function downloadFile(url: string, filename: string): Promise<void> {
  const token = getAccessToken();

  const res = await fetch(`${BASE_URL}${url}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Export failed' }));
    throw new Error(
      (error as { message?: string }).message || 'Export failed',
    );
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

export function useExportRelease(releaseId: string) {
  const [loading, setLoading] = useState(false);

  const exportRelease = async (format: 'csv' | 'pdf') => {
    setLoading(true);
    try {
      const ext = format;
      const filename = `release-report-${releaseId}.${ext}`;
      await downloadFile(`/releases/${releaseId}/export?format=${format}`, filename);
      toast.success(`Release report exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to export release report',
      );
    } finally {
      setLoading(false);
    }
  };

  return { exportRelease, loading };
}

export function useExportBugs(projectId: string) {
  const [loading, setLoading] = useState(false);

  const exportBugs = async (
    format: 'csv' | 'pdf',
    filters?: Record<string, string>,
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ format });
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (value) params.set(key, value);
        }
      }
      const ext = format;
      const filename = `bugs-export-${projectId}.${ext}`;
      await downloadFile(
        `/projects/${projectId}/bugs/export?${params.toString()}`,
        filename,
      );
      toast.success(`Bug report exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to export bug report',
      );
    } finally {
      setLoading(false);
    }
  };

  return { exportBugs, loading };
}
