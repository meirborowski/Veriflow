'use client';

import { useRef } from 'react';
import {
  FileText,
  Image,
  File,
  Download,
  Trash2,
  Upload,
  Loader2,
  Paperclip,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAttachments,
  useUploadAttachment,
  useDeleteAttachment,
  useDownloadAttachment,
} from '@/hooks/use-attachments';
import type { AttachmentItem } from '@/types/attachments';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) {
    return <Image className="h-4 w-4 text-blue-500" />;
  }
  if (mimeType === 'application/pdf') {
    return <FileText className="h-4 w-4 text-red-500" />;
  }
  return <File className="h-4 w-4 text-muted-foreground" />;
}

function AttachmentRow({
  attachment,
  entityType,
  entityId,
}: {
  attachment: AttachmentItem;
  entityType: string;
  entityId: string;
}) {
  const deleteAttachment = useDeleteAttachment(entityType, entityId);
  const downloadAttachment = useDownloadAttachment();

  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <FileIcon mimeType={attachment.mimeType} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {attachment.originalName}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(attachment.size)} &middot;{' '}
            {attachment.uploadedBy?.name ?? 'Unknown'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            downloadAttachment.mutate(attachment.id, {
              onError: () => toast.error('Failed to download file'),
            });
          }}
          aria-label="Download"
        >
          <Download className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete attachment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{attachment.originalName}
                &quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  deleteAttachment.mutate(attachment.id, {
                    onSuccess: () => toast.success('Attachment deleted'),
                    onError: () => toast.error('Failed to delete attachment'),
                  });
                }}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export function AttachmentList({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: attachments, isLoading } = useAttachments(entityType, entityId);
  const uploadAttachment = useUploadAttachment(entityType, entityId);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadAttachment.mutate(file, {
      onSuccess: () => toast.success('File uploaded'),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Upload failed'),
    });

    e.target.value = '';
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-1.5">
          <Paperclip className="h-4 w-4" />
          Attachments
          {attachments && attachments.length > 0 && (
            <span className="text-muted-foreground">
              ({attachments.length})
            </span>
          )}
        </h3>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadAttachment.isPending}
          >
            {uploadAttachment.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload
          </Button>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </>
        ) : attachments && attachments.length > 0 ? (
          attachments.map((att) => (
            <AttachmentRow
              key={att.id}
              attachment={att}
              entityType={entityType}
              entityId={entityId}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            No attachments yet.
          </p>
        )}
      </div>
    </div>
  );
}
