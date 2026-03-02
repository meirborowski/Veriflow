export enum NotificationType {
  BUG_ASSIGNED = 'BUG_ASSIGNED',
  BUG_STATUS_CHANGED = 'BUG_STATUS_CHANGED',
  RELEASE_CLOSED = 'RELEASE_CLOSED',
  MEMBER_ADDED = 'MEMBER_ADDED',
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}
