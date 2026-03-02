import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  NotificationItem,
  NotificationQueryParams,
} from '@/types/notifications';
import type { PaginationMeta } from '@/types/projects';

interface PaginatedNotifications {
  data: NotificationItem[];
  meta: PaginationMeta;
}

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (params?: NotificationQueryParams) =>
    [...notificationKeys.lists(), params] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

export function useNotifications(params: NotificationQueryParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.unreadOnly) searchParams.set('unreadOnly', 'true');

  const query = searchParams.toString();
  const url = `/notifications${query ? `?${query}` : ''}`;

  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => api.get<PaginatedNotifications>(url),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
    refetchInterval: 30_000,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      api.patch(`/notifications/${notificationId}/read`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
      });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
      });
    },
  });
}
