'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSocket } from '@/context/socket-context';
import { bugKeys } from '@/hooks/use-bugs';
import type {
  AssignedStory,
  DashboardSummary,
  StepStatus,
  TestStatus,
} from '@/types/test-execution';

type RunnerState = 'idle' | 'executing' | 'pool-empty';

interface StepState {
  stepId: string;
  status: StepStatus | null;
  comment: string;
}

interface TestRunnerState {
  state: RunnerState;
  currentStory: AssignedStory | null;
  stepStatuses: Map<string, StepState>;
  summary: DashboardSummary | null;
  activeTesters: Set<string>;
  isPoolEmpty: boolean;
}

export function useTestRunner(releaseId: string) {
  const socket = useSocket();
  const queryClient = useQueryClient();

  const [runnerState, setRunnerState] = useState<TestRunnerState>({
    state: 'idle',
    currentStory: null,
    stepStatuses: new Map(),
    summary: null,
    activeTesters: new Set(),
    isPoolEmpty: false,
  });

  // Join session on mount
  useEffect(() => {
    if (socket.isConnected) {
      socket.joinSession(releaseId);
    }
  }, [socket, releaseId]);

  // Listen for events
  useEffect(() => {
    const unsubs = [
      socket.onStoryAssigned((data: AssignedStory) => {
        const stepMap = new Map<string, StepState>();
        for (const step of data.releaseStory.steps) {
          stepMap.set(step.id, {
            stepId: step.id,
            status: null,
            comment: '',
          });
        }

        setRunnerState((prev) => ({
          ...prev,
          state: 'executing',
          currentStory: data,
          stepStatuses: stepMap,
          isPoolEmpty: false,
        }));
      }),

      socket.onPoolEmpty(() => {
        setRunnerState((prev) => ({
          ...prev,
          state: 'pool-empty',
          isPoolEmpty: true,
        }));
      }),

      socket.onDashboardUpdate((data: DashboardSummary) => {
        setRunnerState((prev) => ({
          ...prev,
          summary: data,
        }));
      }),

      socket.onTesterJoined((data) => {
        setRunnerState((prev) => {
          const testers = new Set(prev.activeTesters);
          testers.add(data.userId);
          return { ...prev, activeTesters: testers };
        });
      }),

      socket.onTesterLeft((data) => {
        setRunnerState((prev) => {
          const testers = new Set(prev.activeTesters);
          testers.delete(data.userId);
          return { ...prev, activeTesters: testers };
        });
      }),

      socket.onResultSubmitted(() => {
        setRunnerState((prev) => ({
          ...prev,
          state: 'idle',
          currentStory: null,
          stepStatuses: new Map(),
        }));
        queryClient.invalidateQueries({ queryKey: bugKeys.lists() });
      }),

      socket.onError((data) => {
        toast.error(data.message);
      }),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [socket, queryClient]);

  const requestWork = useCallback(() => {
    socket.requestWork(releaseId);
  }, [socket, releaseId]);

  const markStep = useCallback(
    (stepId: string, status: StepStatus, comment?: string) => {
      if (!runnerState.currentStory) return;

      socket.updateStep(
        runnerState.currentStory.executionId,
        stepId,
        status,
        comment,
      );

      setRunnerState((prev) => {
        const stepStatuses = new Map(prev.stepStatuses);
        stepStatuses.set(stepId, {
          stepId,
          status,
          comment: comment ?? '',
        });
        return { ...prev, stepStatuses };
      });
    },
    [socket, runnerState.currentStory],
  );

  const submitResult = useCallback(
    (
      status: TestStatus,
      comment?: string,
      bug?: { title: string; description: string; severity: string },
    ) => {
      if (!runnerState.currentStory) return;
      socket.submitResult(
        runnerState.currentStory.executionId,
        status,
        comment,
        bug,
      );
    },
    [socket, runnerState.currentStory],
  );

  return {
    ...runnerState,
    isConnected: socket.isConnected,
    requestWork,
    markStep,
    submitResult,
  };
}
