export enum UserRole {
  ADMIN = 'ADMIN',
  PM = 'PM',
  DEVELOPER = 'DEVELOPER',
  TESTER = 'TESTER',
}

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

export enum ReleaseStatus {
  DRAFT = 'DRAFT',
  CLOSED = 'CLOSED',
}

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

export enum BugStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
}

export enum NotificationType {
  BUG_ASSIGNED = 'BUG_ASSIGNED',
  BUG_STATUS_CHANGED = 'BUG_STATUS_CHANGED',
  RELEASE_CLOSED = 'RELEASE_CLOSED',
  MEMBER_ADDED = 'MEMBER_ADDED',
}
