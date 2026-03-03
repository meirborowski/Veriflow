export interface AttachmentItem {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  entityType: string;
  entityId: string;
  uploadedBy: {
    id: string;
    name: string;
  };
  createdAt: string;
}
