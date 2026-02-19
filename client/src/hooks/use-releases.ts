import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import type { PaginatedResponse } from '@/types/projects';
import type {
  ReleaseListItem,
  ReleaseDetail,
  CloseReleaseResponse,
  CreateReleasePayload,
  UpdateReleasePayload,
  AddStoriesPayload,
} from '@/types/releases';

interface ReleaseQueryParams {
  page?: number;
  limit?: number;
  status?: string;
}

export const releaseKeys = {
  all: ['releases'] as const,
  lists: () => [...releaseKeys.all, 'list'] as const,
  list: (projectId: string, params?: ReleaseQueryParams) =>
    [...releaseKeys.lists(), projectId, params] as const,
  details: () => [...releaseKeys.all, 'detail'] as const,
  detail: (id: string) => [...releaseKeys.details(), id] as const,
};

export function useReleases(projectId: string, params: ReleaseQueryParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.status) searchParams.set('status', params.status);

  const query = searchParams.toString();
  const url = `/projects/${projectId}/releases${query ? `?${query}` : ''}`;

  return useQuery({
    queryKey: releaseKeys.list(projectId, params),
    queryFn: () => api.get<PaginatedResponse<ReleaseListItem>>(url),
  });
}

export function useRelease(id: string) {
  return useQuery({
    queryKey: releaseKeys.detail(id),
    queryFn: () => api.get<ReleaseDetail>(`/releases/${id}`),
    enabled: !!id,
  });
}

export function useCreateRelease(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReleasePayload) =>
      api.post<ReleaseDetail>(`/projects/${projectId}/releases`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: releaseKeys.lists() });
      toast.success('Release created');
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiError ? error.message : 'Failed to create release';
      toast.error(message);
    },
  });
}

export function useUpdateRelease(releaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateReleasePayload) =>
      api.patch<ReleaseDetail>(`/releases/${releaseId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: releaseKeys.detail(releaseId) });
      queryClient.invalidateQueries({ queryKey: releaseKeys.lists() });
      toast.success('Release updated');
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiError ? error.message : 'Failed to update release';
      toast.error(message);
    },
  });
}

export function useDeleteRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/releases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: releaseKeys.lists() });
      toast.success('Release deleted');
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiError ? error.message : 'Failed to delete release';
      toast.error(message);
    },
  });
}

export function useCloseRelease(releaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<CloseReleaseResponse>(`/releases/${releaseId}/close`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: releaseKeys.detail(releaseId) });
      queryClient.invalidateQueries({ queryKey: releaseKeys.lists() });
      toast.success('Release closed');
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiError ? error.message : 'Failed to close release';
      toast.error(message);
    },
  });
}

export function useAddStoriesToRelease(releaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddStoriesPayload) =>
      api.post<{ added: number }>(`/releases/${releaseId}/stories`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: releaseKeys.detail(releaseId) });
      queryClient.invalidateQueries({ queryKey: releaseKeys.lists() });
      toast.success('Stories added to release');
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiError ? error.message : 'Failed to add stories';
      toast.error(message);
    },
  });
}

export function useRemoveStoryFromRelease(releaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storyId: string) =>
      api.delete(`/releases/${releaseId}/stories/${storyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: releaseKeys.detail(releaseId) });
      queryClient.invalidateQueries({ queryKey: releaseKeys.lists() });
      toast.success('Story removed from release');
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Failed to remove story from release';
      toast.error(message);
    },
  });
}
