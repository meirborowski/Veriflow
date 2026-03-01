import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import type {
  BugDetail,
  BugQueryParams,
  CreateBugPayload,
  UpdateBugPayload,
  PaginatedBugs,
} from '@/types/bugs';

export const bugKeys = {
  all: ['bugs'] as const,
  lists: () => [...bugKeys.all, 'list'] as const,
  list: (projectId: string, params?: BugQueryParams) =>
    [...bugKeys.lists(), projectId, params] as const,
  details: () => [...bugKeys.all, 'detail'] as const,
  detail: (id: string) => [...bugKeys.details(), id] as const,
};

export function useBugs(projectId: string, params: BugQueryParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.status) searchParams.set('status', params.status);
  if (params.severity) searchParams.set('severity', params.severity);
  if (params.storyId) searchParams.set('storyId', params.storyId);

  const query = searchParams.toString();
  const url = `/projects/${projectId}/bugs${query ? `?${query}` : ''}`;

  return useQuery({
    queryKey: bugKeys.list(projectId, params),
    queryFn: () => api.get<PaginatedBugs>(url),
  });
}

export function useBug(id: string) {
  return useQuery({
    queryKey: bugKeys.detail(id),
    queryFn: () => api.get<BugDetail>(`/bugs/${id}`),
    enabled: !!id,
  });
}

export function useCreateBug(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBugPayload) =>
      api.post<BugDetail>(`/projects/${projectId}/bugs`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bugKeys.lists() });
      toast.success('Bug reported');
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiError ? error.message : 'Failed to report bug';
      toast.error(message);
    },
  });
}

export function useUpdateBug(bugId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateBugPayload) =>
      api.patch<BugDetail>(`/bugs/${bugId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bugKeys.detail(bugId) });
      queryClient.invalidateQueries({ queryKey: bugKeys.lists() });
      toast.success('Bug updated');
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiError ? error.message : 'Failed to update bug';
      toast.error(message);
    },
  });
}

export function useDeleteBug(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/bugs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: bugKeys.list(projectId),
      });
      toast.success('Bug deleted');
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiError ? error.message : 'Failed to delete bug';
      toast.error(message);
    },
  });
}
