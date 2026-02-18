import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import type {
  PaginatedResponse,
  ProjectWithRole,
  ProjectDetail,
  UserRole,
} from '@/types/projects';

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (page: number, limit: number) => [...projectKeys.lists(), { page, limit }] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

export function useProjects(page: number, limit: number) {
  return useQuery({
    queryKey: projectKeys.list(page, limit),
    queryFn: () =>
      api.get<PaginatedResponse<ProjectWithRole>>(`/projects?page=${page}&limit=${limit}`),
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
