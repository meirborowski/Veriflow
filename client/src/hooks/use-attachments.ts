'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AttachmentItem } from '@/types/attachments';

export function useAttachments(entityType: string, entityId: string) {
  return useQuery<AttachmentItem[]>({
    queryKey: ['attachments', entityType, entityId],
    queryFn: () =>
      api.get<AttachmentItem[]>(
        `/attachments/entity/${entityType}/${entityId}`,
      ),
  });
}

export function useUploadAttachment(entityType: string, entityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.upload<AttachmentItem>(
        `/attachments/entity/${entityType}/${entityId}`,
        formData,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['attachments', entityType, entityId],
      });
    },
  });
}

export function useDeleteAttachment(entityType: string, entityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attachmentId: string) =>
      api.delete(`/attachments/${attachmentId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['attachments', entityType, entityId],
      });
    },
  });
}

export function useDownloadAttachment() {
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      // Open blank window synchronously (user-initiated context) to avoid
      // popup blockers, then navigate it once the signed URL is available.
      const newWindow = window.open('', '_blank');

      const { url } = await api.get<{ url: string }>(
        `/attachments/${attachmentId}/download`,
      );

      if (newWindow) {
        newWindow.location.href = url;
      } else {
        window.location.href = url;
      }
    },
  });
}
