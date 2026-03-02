import type { PaginationMeta } from './projects';
import { BugSeverity } from './test-execution';

export { BugSeverity } from './test-execution';

export enum BugStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
}

export interface BugListItem {
  id: string;
  title: string;
  severity: BugSeverity;
  status: BugStatus;
  storyTitle: string;
  reportedByName: string;
  assignedToName: string | null;
  createdAt: string;
}

export interface BugDetail {
  id: string;
  projectId: string;
  storyId: string;
  executionId: string | null;
  title: string;
  description: string;
  severity: BugSeverity;
  status: BugStatus;
  reportedById: string;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  story: {
    id: string;
    title: string;
  };
  execution: {
    id: string;
    attempt: number;
    status: string;
  } | null;
  reportedBy: {
    id: string;
    name: string;
    email: string;
  };
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface CreateBugPayload {
  storyId: string;
  executionId?: string;
  title: string;
  description: string;
  severity: BugSeverity;
}

export interface UpdateBugPayload {
  status?: BugStatus;
  assignedToId?: string | null;
  severity?: BugSeverity;
  title?: string;
  description?: string;
}

export interface BugQueryParams {
  page?: number;
  limit?: number;
  status?: BugStatus;
  severity?: BugSeverity;
  storyId?: string;
  search?: string;
  orderBy?: string;
  sortDir?: string;
}

export interface PaginatedBugs {
  data: BugListItem[];
  meta: PaginationMeta;
}
