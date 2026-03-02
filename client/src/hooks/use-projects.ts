import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import type {
  PaginatedResponse,
  ProjectWithRole,
  ProjectDetail,
  UserRole,
} from '@/types/projects';

interface ProjectQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  orderBy?: string;
  sortDir?: string;
}

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (params?: ProjectQueryParams) => [...projectKeys.lists(), params] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

export function useProjects(params: ProjectQueryParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.search) searchParams.set('search', params.search);
  if (params.orderBy) searchParams.set('orderBy', params.orderBy);
  if (params.sortDir) searchParams.set('sortDir', params.sortDir);

  const query = searchParams.toString();
  const url = `/projects${query ? `?${query}` : ''}`;

  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: () => api.get<PaginatedResponse<ProjectWithRole>>(url),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => api.get<ProjectDetail>(`/projects/${id}`),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post<{ id: string; name: string; description: string | null; createdAt: string }>(
        '/projects',
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      toast.success('Project created');
    },
    onError: (error: Error) => {
      const message = error instanceof ApiError ? error.message : 'Failed to create project';
      toast.error(message);
    },
  });
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name?: string; description?: string }) =>
      api.patch(`/projects/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      toast.success('Project updated');
    },
    onError: (error: Error) => {
      const message = error instanceof ApiError ? error.message : 'Failed to update project';
      toast.error(message);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      toast.success('Project deleted');
    },
    onError: (error: Error) => {
      const message = error instanceof ApiError ? error.message : 'Failed to delete project';
      toast.error(message);
    },
  });
}

export function useAddMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { email: string; role: UserRole }) =>
      api.post(`/projects/${projectId}/members`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      toast.success('Member added');
    },
    onError: (error: Error) => {
      const message = error instanceof ApiError ? error.message : 'Failed to add member';
      toast.error(message);
    },
  });
}

export function useUpdateMemberRole(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { userId: string; role: UserRole }) =>
      api.patch(`/projects/${projectId}/members/${data.userId}`, { role: data.role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      toast.success('Role updated');
    },
    onError: (error: Error) => {
      const message = error instanceof ApiError ? error.message : 'Failed to update role';
      toast.error(message);
    },
  });
}

export function useRemoveMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/projects/${projectId}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      toast.success('Member removed');
    },
    onError: (error: Error) => {
      const message = error instanceof ApiError ? error.message : 'Failed to remove member';
      toast.error(message);
    },
  });
}
