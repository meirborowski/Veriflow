'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { getAccessToken } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { notificationKeys } from '@/hooks/use-notifications';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export function NotificationSocketProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) return;

    const token = getAccessToken();
    if (!token) return;

    const socket = io(`${SOCKET_URL}/notifications`, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('new-notification', () => {
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, queryClient]);

  return <>{children}</>;
}
