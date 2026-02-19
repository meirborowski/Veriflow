import type { Priority } from './user-stories';

export enum ReleaseStatus {
  DRAFT = 'DRAFT',
  CLOSED = 'CLOSED',
}

export interface ReleaseListItem {
  id: string;
  name: string;
  status: ReleaseStatus;
  storyCount: number;
  createdAt: string;
  closedAt: string | null;
}

export interface ReleaseStoryStep {
  id: string;
  releaseStoryId: string;
  order: number;
  instruction: string;
}

export interface ReleaseDetailDraftStory {
  id: string;
  title: string;
  priority: Priority;
  status: string;
  stepCount: number;
}

export interface ReleaseDetailSnapshotStory {
  id: string;
  sourceStoryId: string;
  title: string;
  description: string;
  priority: Priority;
  steps: ReleaseStoryStep[];
}

export interface ReleaseDetail {
  id: string;
  projectId: string;
  name: string;
  status: ReleaseStatus;
  createdAt: string;
  closedAt: string | null;
  stories: ReleaseDetailDraftStory[] | ReleaseDetailSnapshotStory[];
}

export interface CloseReleaseResponse {
  id: string;
  name: string;
  status: ReleaseStatus;
  closedAt: string;
  storyCount: number;
}

export interface CreateReleasePayload {
  name: string;
}

export interface UpdateReleasePayload {
  name?: string;
}

export interface AddStoriesPayload {
  storyIds: string[];
}
