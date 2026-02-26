import type { PaginationMeta } from './projects';

export enum TestStatus {
  UNTESTED = 'UNTESTED',
  IN_PROGRESS = 'IN_PROGRESS',
  PASS = 'PASS',
  FAIL = 'FAIL',
  PARTIALLY_TESTED = 'PARTIALLY_TESTED',
  CANT_BE_TESTED = 'CANT_BE_TESTED',
}

export enum StepStatus {
  PASS = 'PASS',
  FAIL = 'FAIL',
  SKIPPED = 'SKIPPED',
}

export enum BugSeverity {
  CRITICAL = 'CRITICAL',
  MAJOR = 'MAJOR',
  MINOR = 'MINOR',
  TRIVIAL = 'TRIVIAL',
}

// WebSocket payloads

export interface AssignedStory {
  executionId: string;
  releaseStory: {
    id: string;
    title: string;
    description: string;
    priority: string;
    steps: { id: string; order: number; instruction: string }[];
  };
  attempt: number;
}

export interface DashboardSummary {
  total: number;
  untested: number;
  inProgress: number;
  pass: number;
  fail: number;
  partiallyTested: number;
  cantBeTested: number;
}

export interface StatusChangedEvent {
  releaseStoryId: string;
  status: string;
  userId: string;
}

export interface TesterEvent {
  userId: string;
  unlockedStoryId?: string | null;
}

// REST response types

export interface ExecutionListItem {
  id: string;
  releaseStoryId: string;
  storyTitle: string;
  assignedToUserId: string;
  testerName: string;
  attempt: number;
  status: TestStatus;
  startedAt: string;
  completedAt: string | null;
}

export interface LatestExecutionItem {
  releaseStoryId: string;
  storyTitle: string;
  priority: string;
  latestStatus: TestStatus;
  latestExecutionId: string | null;
  attempt: number;
}

export interface LatestExecutionsResponse {
  stories: LatestExecutionItem[];
  summary: DashboardSummary;
}

export interface ExecutionDetail {
  id: string;
  releaseId: string;
  releaseStoryId: string;
  assignedToUserId: string;
  attempt: number;
  status: TestStatus;
  comment: string | null;
  startedAt: string;
  completedAt: string | null;
  storyTitle: string;
  testerName: string;
  stepResults: {
    id: string;
    releaseStoryStepId: string;
    status: StepStatus;
    comment: string | null;
  }[];
}

export interface PaginatedExecutions {
  data: ExecutionListItem[];
  meta: PaginationMeta;
}
