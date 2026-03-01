import type { PaginationMeta } from './projects';

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
  severity: string;
  status: string;
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
  severity: string;
  status: string;
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
  severity: string;
}

export interface UpdateBugPayload {
  status?: string;
  assignedToId?: string | null;
  severity?: string;
  title?: string;
  description?: string;
}

export interface BugQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  severity?: string;
  storyId?: string;
}

export interface PaginatedBugs {
  data: BugListItem[];
  meta: PaginationMeta;
}
