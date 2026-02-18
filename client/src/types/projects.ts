export enum UserRole {
  ADMIN = 'ADMIN',
  PM = 'PM',
  DEVELOPER = 'DEVELOPER',
  TESTER = 'TESTER',
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ProjectWithRole {
  id: string;
  name: string;
  description: string | null;
  role: UserRole;
  createdAt: string;
}

export interface ProjectMember {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  members: ProjectMember[];
}
