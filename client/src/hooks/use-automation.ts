import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import type {
  AutomationRun,
  AutomationSummary,
  PaginatedRuns,
  PaginatedTests,
  ProjectRepoConfig,
  RunStatus,
  TestDetail,
  TriggerResult,
} from '@/types/automation';
import { TERMINAL_STATUSES } from '@/types/automation';

export const automationKeys = {
  all: ['automation'] as const,
  tests: (projectId: string, params?: Record<string, unknown>) =>
    [...automationKeys.all, 'tests', projectId, params] as const,
  test: (id: string) => [...automationKeys.all, 'test', id] as const,
  summary: (storyId: string) => [...automationKeys.all, 'summary', storyId] as const,
  runs: (projectId: string, params?: Record<string, unknown>) =>
    [...automationKeys.all, 'runs', projectId, params] as const,
  run: (id: string) => [...automationKeys.all, 'run', id] as const,
  runStatus: (id: string) => [...automationKeys.all, 'run-status', id] as const,
  config: (projectId: string) => [...automationKeys.all, 'config', projectId] as const,
};

export interface TestQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string;
  linkedStoryId?: string;
  status?: string;
}

export function useTests(projectId: string, params: TestQueryParams = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.tags) qs.set('tags', params.tags);
  if (params.linkedStoryId) qs.set('linkedStoryId', params.linkedStoryId);
  if (params.status) qs.set('status', params.status);
  const url = `/projects/${projectId}/automation/tests${qs.toString() ? `?${qs}` : ''}`;
  return useQuery({
    queryKey: automationKeys.tests(projectId, params as Record<string, unknown>),
    queryFn: () => api.get<PaginatedTests>(url),
    enabled: !!projectId,
  });
}

export function useTest(testId: string) {
  return useQuery({
    queryKey: automationKeys.test(testId),
    queryFn: () => api.get<TestDetail>(`/automation/tests/${testId}`),
    enabled: !!testId,
  });
}

export function useDeleteTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (testId: string) => api.delete(`/automation/tests/${testId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.all });
      toast.success('Test deleted');
    },
    onError: (error: Error) => {
      toast.error(error instanceof ApiError ? error.message : 'Failed to delete test');
    },
  });
}

export function useLinkTests(storyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (testIds: string[]) =>
      api.post(`/stories/${storyId}/automation/link`, { testIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.summary(storyId) });
      toast.success('Tests linked');
    },
    onError: (error: Error) => {
      toast.error(error instanceof ApiError ? error.message : 'Failed to link tests');
    },
  });
}

export function useUnlinkTest(storyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (testId: string) =>
      api.delete(`/stories/${storyId}/automation/link/${testId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.summary(storyId) });
      toast.success('Test unlinked');
    },
    onError: (error: Error) => {
      toast.error(error instanceof ApiError ? error.message : 'Failed to unlink test');
    },
  });
}

export function useAutomationSummary(storyId: string) {
  return useQuery({
    queryKey: automationKeys.summary(storyId),
    queryFn: () => api.get<AutomationSummary>(`/stories/${storyId}/automation/summary`),
    enabled: !!storyId,
  });
}

export function useTriggerRun(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { testIds?: string[]; releaseId?: string; baseUrl: string }) =>
      api.post<TriggerResult>(`/projects/${projectId}/automation/trigger`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.runs(projectId) });
      toast.success('Run triggered');
    },
    onError: (error: Error) => {
      toast.error(error instanceof ApiError ? error.message : 'Failed to trigger run');
    },
  });
}

export interface RunQueryParams {
  page?: number;
  limit?: number;
  testId?: string;
  status?: string;
  releaseId?: string;
}

export function useRuns(projectId: string, params: RunQueryParams = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.testId) qs.set('testId', params.testId);
  if (params.status) qs.set('status', params.status);
  if (params.releaseId) qs.set('releaseId', params.releaseId);
  const url = `/projects/${projectId}/automation/runs${qs.toString() ? `?${qs}` : ''}`;
  return useQuery({
    queryKey: automationKeys.runs(projectId, params as Record<string, unknown>),
    queryFn: () => api.get<PaginatedRuns>(url),
    enabled: !!projectId,
  });
}

export function useRun(runId: string) {
  return useQuery({
    queryKey: automationKeys.run(runId),
    queryFn: () => api.get<AutomationRun>(`/automation/runs/${runId}`),
    enabled: !!runId,
  });
}

export function useRunStatus(runId: string, enabled = true) {
  return useQuery({
    queryKey: automationKeys.runStatus(runId),
    queryFn: () => api.get<RunStatus>(`/automation/runs/${runId}/status`),
    enabled: !!runId && enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || TERMINAL_STATUSES.has(status)) return false;
      return 2000;
    },
  });
}

export function useRepoConfig(projectId: string) {
  return useQuery({
    queryKey: automationKeys.config(projectId),
    queryFn: () => api.get<ProjectRepoConfig>(`/projects/${projectId}/automation/config`),
    enabled: !!projectId,
  });
}

export interface UpsertRepoConfigPayload {
  repoUrl: string;
  branch?: string;
  testDirectory?: string;
  playwrightConfig?: string;
  authToken?: string;
}

export function useUpsertRepoConfig(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertRepoConfigPayload) =>
      api.put<ProjectRepoConfig>(`/projects/${projectId}/automation/config`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.config(projectId) });
      toast.success('Repo config saved');
    },
    onError: (error: Error) => {
      toast.error(error instanceof ApiError ? error.message : 'Failed to save repo config');
    },
  });
}
