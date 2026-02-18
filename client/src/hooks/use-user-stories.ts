import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import type { PaginatedResponse } from '@/types/projects';
import type {
  StoryListItem,
  StoryDetail,
  CreateStoryPayload,
  UpdateStoryPayload,
} from '@/types/user-stories';

interface StoryQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  search?: string;
}

export const storyKeys = {
  all: ['stories'] as const,
  lists: () => [...storyKeys.all, 'list'] as const,
  list: (projectId: string, params?: StoryQueryParams) =>
    [...storyKeys.lists(), projectId, params] as const,
  details: () => [...storyKeys.all, 'detail'] as const,
  detail: (id: string) => [...storyKeys.details(), id] as const,
};

export function useStories(projectId: string, params: StoryQueryParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.status) searchParams.set('status', params.status);
  if (params.priority) searchParams.set('priority', params.priority);
  if (params.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  const url = `/projects/${projectId}/stories${query ? `?${query}` : ''}`;

  return useQuery({
    queryKey: storyKeys.list(projectId, params),
    queryFn: () => api.get<PaginatedResponse<StoryListItem>>(url),
  });
}

export function useStory(id: string) {
  return useQuery({
    queryKey: storyKeys.detail(id),
    queryFn: () => api.get<StoryDetail>(`/stories/${id}`),
    enabled: !!id,
  });
}

export function useCreateStory(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStoryPayload) =>
      api.post<StoryDetail>(`/projects/${projectId}/stories`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storyKeys.lists() });
      toast.success('Story created');
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiError ? error.message : 'Failed to create story';
      toast.error(message);
    },
  });
}

export function useUpdateStory(storyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateStoryPayload) =>
      api.patch<StoryDetail>(`/stories/${storyId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storyKeys.detail(storyId) });
      queryClient.invalidateQueries({ queryKey: storyKeys.lists() });
      toast.success('Story updated');
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiError ? error.message : 'Failed to update story';
      toast.error(message);
    },
  });
}

export function useDeleteStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/stories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storyKeys.lists() });
      toast.success('Story deleted');
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiError ? error.message : 'Failed to delete story';
      toast.error(message);
    },
  });
}
