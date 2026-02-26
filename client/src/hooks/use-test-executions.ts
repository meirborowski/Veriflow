import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  PaginatedExecutions,
  LatestExecutionsResponse,
  ExecutionDetail,
} from '@/types/test-execution';

interface ExecutionQueryParams {
  page?: number;
  limit?: number;
  storyId?: string;
  status?: string;
}

export const executionKeys = {
  all: ['executions'] as const,
  lists: () => [...executionKeys.all, 'list'] as const,
  list: (releaseId: string, params?: ExecutionQueryParams) =>
    [...executionKeys.lists(), releaseId, params] as const,
  latest: (releaseId: string) =>
    [...executionKeys.all, 'latest', releaseId] as const,
  details: () => [...executionKeys.all, 'detail'] as const,
  detail: (id: string) => [...executionKeys.details(), id] as const,
};

export function useExecutions(
  releaseId: string,
  params: ExecutionQueryParams = {},
) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.storyId) searchParams.set('storyId', params.storyId);
  if (params.status) searchParams.set('status', params.status);

  const query = searchParams.toString();
  const url = `/releases/${releaseId}/executions${query ? `?${query}` : ''}`;

  return useQuery({
    queryKey: executionKeys.list(releaseId, params),
    queryFn: () => api.get<PaginatedExecutions>(url),
    enabled: !!releaseId,
  });
}

export function useLatestExecutions(releaseId: string) {
  return useQuery({
    queryKey: executionKeys.latest(releaseId),
    queryFn: () =>
      api.get<LatestExecutionsResponse>(
        `/releases/${releaseId}/executions/latest`,
      ),
    enabled: !!releaseId,
  });
}

export function useExecution(id: string) {
  return useQuery({
    queryKey: executionKeys.detail(id),
    queryFn: () => api.get<ExecutionDetail>(`/executions/${id}`),
    enabled: !!id,
  });
}
