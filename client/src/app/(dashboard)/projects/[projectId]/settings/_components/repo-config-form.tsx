'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useRepoConfig, useUpsertRepoConfig } from '@/hooks/use-automation';

interface RepoConfigFormProps {
  projectId: string;
}

export function RepoConfigForm({ projectId }: RepoConfigFormProps) {
  const { data: config, isLoading } = useRepoConfig(projectId);
  const { mutate: upsert, isPending } = useUpsertRepoConfig(projectId);

  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [testDirectory, setTestDirectory] = useState('tests');
  const [playwrightConfig, setPlaywrightConfig] = useState('');
  const [authToken, setAuthToken] = useState('');

  useEffect(() => {
    if (config) {
      setRepoUrl(config.repoUrl ?? '');
      setBranch(config.branch ?? 'main');
      setTestDirectory(config.testDirectory ?? 'tests');
      setPlaywrightConfig(config.playwrightConfig ?? '');
      // authToken is masked (***) — leave blank so user can optionally update it
    }
  }, [config]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    upsert({
      repoUrl,
      branch: branch || undefined,
      testDirectory: testDirectory || undefined,
      playwrightConfig: playwrightConfig || undefined,
      authToken: authToken || undefined,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="repo-url">Repository URL *</Label>
        <Input
          id="repo-url"
          placeholder="https://github.com/org/repo"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="branch">Branch</Label>
          <Input
            id="branch"
            placeholder="main"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="test-dir">Test Directory</Label>
          <Input
            id="test-dir"
            placeholder="tests"
            value={testDirectory}
            onChange={(e) => setTestDirectory(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pw-config">Playwright Config (optional)</Label>
        <Input
          id="pw-config"
          placeholder="playwright.config.ts"
          value={playwrightConfig}
          onChange={(e) => setPlaywrightConfig(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="auth-token">
          Personal Access Token{config ? ' (leave blank to keep existing)' : ' (optional)'}
        </Label>
        <Input
          id="auth-token"
          type="password"
          placeholder={config ? '••••••••' : 'ghp_...'}
          value={authToken}
          onChange={(e) => setAuthToken(e.target.value)}
          autoComplete="new-password"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={!repoUrl.trim() || isPending}>
          {isPending ? 'Saving…' : 'Save Config'}
        </Button>
      </div>
    </form>
  );
}
