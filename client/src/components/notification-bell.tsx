'use client';

import { useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/use-notifications';
import { NotificationType } from '@/types/notifications';
import type { NotificationItem } from '@/types/notifications';

function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case NotificationType.BUG_ASSIGNED:
      return '🐛';
    case NotificationType.BUG_STATUS_CHANGED:
      return '🔄';
    case NotificationType.RELEASE_CLOSED:
      return '📦';
    case NotificationType.MEMBER_ADDED:
      return '👤';
    default:
      return '🔔';
  }
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: NotificationItem;
  onMarkRead: (id: string) => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 px-3 py-2.5 transition-colors ${
        notification.isRead
          ? 'opacity-60'
          : 'bg-accent/30'
      }`}
    >
      <span className="mt-0.5 text-base leading-none">
        {getNotificationIcon(notification.type)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{notification.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
          })}
        </p>
      </div>
      {!notification.isRead && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead(notification.id);
          }}
          title="Mark as read"
        >
          <Check className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: countData } = useUnreadCount();
  const { data: notificationsData } = useNotifications({
    page: 1,
    limit: 10,
  });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = countData?.count ?? 0;
  const notifications = notificationsData?.data ?? [];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={() => markAllAsRead.mutate()}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No notifications
            </p>
          ) : (
            notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onMarkRead={(id) => markAsRead.mutate(id)}
              />
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
