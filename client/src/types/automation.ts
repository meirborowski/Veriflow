export enum AutomationRunStatus {
  QUEUED = 'QUEUED',
  CLONING = 'CLONING',
  INSTALLING = 'INSTALLING',
  RUNNING = 'RUNNING',
  PASS = 'PASS',
  FAIL = 'FAIL',
  ERROR = 'ERROR',
  SKIPPED = 'SKIPPED',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
}

export enum AutomationTrigger {
  UI = 'UI',
  CI_CD = 'CI_CD',
  REGISTRY_SYNC = 'REGISTRY_SYNC',
}

export enum LinkSource {
  USER = 'USER',
  AUTO_DISCOVERY = 'AUTO_DISCOVERY',
}

export interface PlaywrightTest {
  id: string;
  projectId: string;
  externalId: string;
  testFile: string;
  testName: string;
  tags: string[];
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRun {
  id: string;
  projectId: string;
  testId: string;
  releaseId: string | null;
  status: AutomationRunStatus;
  triggeredBy: AutomationTrigger;
  duration: number | null;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  logs: string | null;
  externalRunId: string | null;
  createdAt: string;
}

export interface ProjectRepoConfig {
  id: string;
  projectId: string;
  repoUrl: string;
  branch: string;
  testDirectory: string;
  playwrightConfig: string | null;
  authToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationSummaryTest {
  id: string;
  testName: string;
  testFile: string;
  latestRunStatus: AutomationRunStatus | null;
}

export interface AutomationSummary {
  tests: AutomationSummaryTest[];
  latestManualStatus: string | null;
  hasConflict: boolean;
}

export interface TestDetail {
  test: PlaywrightTest;
  linkedStories: { id: string; title: string; projectId: string }[];
  recentRuns: AutomationRun[];
}

export interface RunStatus {
  status: AutomationRunStatus;
}

export interface PaginatedTests {
  data: PlaywrightTest[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface PaginatedRuns {
  data: AutomationRun[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface TriggerResult {
  runIds: string[];
}

export const TERMINAL_STATUSES = new Set<AutomationRunStatus>([
  AutomationRunStatus.PASS,
  AutomationRunStatus.FAIL,
  AutomationRunStatus.ERROR,
  AutomationRunStatus.TIMEOUT,
  AutomationRunStatus.CANCELLED,
]);
