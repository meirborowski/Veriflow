'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from '@/lib/api';
import type {
  AssignedStory,
  DashboardSummary,
  StatusChangedEvent,
  TesterEvent,
  StepStatus,
  TestStatus,
} from '@/types/test-execution';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const HEARTBEAT_INTERVAL = 15_000;

interface SocketContextValue {
  isConnected: boolean;
  joinSession: (releaseId: string) => void;
  leaveSession: () => void;
  requestWork: (releaseId: string) => void;
  updateStep: (
    executionId: string,
    stepId: string,
    status: StepStatus,
    comment?: string,
  ) => void;
  submitResult: (
    executionId: string,
    status: TestStatus,
    comment?: string,
    bug?: { title: string; description: string; severity: string },
  ) => void;
  onStoryAssigned: (cb: (data: AssignedStory) => void) => () => void;
  onPoolEmpty: (cb: () => void) => () => void;
  onDashboardUpdate: (cb: (data: DashboardSummary) => void) => () => void;
  onStatusChanged: (cb: (data: StatusChangedEvent) => void) => () => void;
  onTesterJoined: (cb: (data: TesterEvent) => void) => () => void;
  onTesterLeft: (cb: (data: TesterEvent) => void) => () => void;
  onResultSubmitted: (
    cb: (data: { executionId: string; status: string }) => void,
  ) => () => void;
  onError: (cb: (data: { message: string }) => void) => () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({
  children,
}: {
  children: ReactNode;
}) {
  const socketRef = useRef<Socket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const socket = io(`${SOCKET_URL}/test-runner`, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Heartbeat
    heartbeatRef.current = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat', {});
      }
    }, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const joinSession = useCallback((releaseId: string) => {
    socketRef.current?.emit('join-session', { releaseId });
  }, []);

  const leaveSession = useCallback(() => {
    socketRef.current?.emit('leave-session');
  }, []);

  const requestWork = useCallback((releaseId: string) => {
    socketRef.current?.emit('request-work', { releaseId });
  }, []);

  const updateStep = useCallback(
    (
      executionId: string,
      stepId: string,
      status: StepStatus,
      comment?: string,
    ) => {
      socketRef.current?.emit('update-step', {
        executionId,
        stepId,
        status,
        comment,
      });
    },
    [],
  );

  const submitResult = useCallback(
    (
      executionId: string,
      status: TestStatus,
      comment?: string,
      bug?: { title: string; description: string; severity: string },
    ) => {
      socketRef.current?.emit('submit-result', {
        executionId,
        status,
        comment,
        bug,
      });
    },
    [],
  );

  const createListener = useCallback(
    <T,>(event: string) => {
      return (cb: (data: T) => void) => {
        const socket = socketRef.current;
        if (!socket) return () => {};
        socket.on(event, cb as (...args: unknown[]) => void);
        return () => {
          socket.off(event, cb as (...args: unknown[]) => void);
        };
      };
    },
    [],
  );

  const onStoryAssigned = useCallback(
    (cb: (data: AssignedStory) => void) => createListener<AssignedStory>('story-assigned')(cb),
    [createListener],
  );

  const onPoolEmpty = useCallback(
    (cb: () => void) => createListener<void>('pool-empty')(cb),
    [createListener],
  );

  const onDashboardUpdate = useCallback(
    (cb: (data: DashboardSummary) => void) =>
      createListener<DashboardSummary>('dashboard-update')(cb),
    [createListener],
  );

  const onStatusChanged = useCallback(
    (cb: (data: StatusChangedEvent) => void) =>
      createListener<StatusChangedEvent>('status-changed')(cb),
    [createListener],
  );

  const onTesterJoined = useCallback(
    (cb: (data: TesterEvent) => void) => createListener<TesterEvent>('tester-joined')(cb),
    [createListener],
  );

  const onTesterLeft = useCallback(
    (cb: (data: TesterEvent) => void) => createListener<TesterEvent>('tester-left')(cb),
    [createListener],
  );

  const onResultSubmitted = useCallback(
    (cb: (data: { executionId: string; status: string }) => void) =>
      createListener<{ executionId: string; status: string }>('result-submitted')(cb),
    [createListener],
  );

  const onError = useCallback(
    (cb: (data: { message: string }) => void) =>
      createListener<{ message: string }>('error')(cb),
    [createListener],
  );

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        joinSession,
        leaveSession,
        requestWork,
        updateStep,
        submitResult,
        onStoryAssigned,
        onPoolEmpty,
        onDashboardUpdate,
        onStatusChanged,
        onTesterJoined,
        onTesterLeft,
        onResultSubmitted,
        onError,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return ctx;
}
