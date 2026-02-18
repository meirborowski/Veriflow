export enum Priority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum StoryStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
}

export interface VerificationStep {
  id: string;
  storyId: string;
  order: number;
  instruction: string;
}

export interface StoryListItem {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: StoryStatus;
  stepCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoryDetail {
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority: Priority;
  status: StoryStatus;
  createdAt: string;
  updatedAt: string;
  steps: VerificationStep[];
}

export interface CreateStoryPayload {
  title: string;
  description: string;
  priority: Priority;
  steps: { order: number; instruction: string }[];
}

export interface UpdateStoryPayload {
  title?: string;
  description?: string;
  priority?: Priority;
  status?: StoryStatus;
  steps?: { id?: string; order: number; instruction: string }[];
}
