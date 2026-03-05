# Data Model

## Entity Relationship Overview

```
User ──────── ProjectMember ──────── Project
                                        │
                              ┌─────────┼──────────┐
                              │         │           │
                          UserStory  Release      Bug
                              │         │
                    VerificationStep  ReleaseStory (snapshot)
                                         │
                                   ReleaseStoryStep (snapshot)
                                         │
                                   TestExecution (per attempt)
                                         │
                                     StepResult


PlaywrightTest ── StoryTestLink ── UserStory
     │
AutomationRun (per execution, optional Release)
```

## Core Entities

### User
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| email | varchar | unique |
| name | varchar | |
| passwordHash | varchar | bcrypt |
| refreshTokenHash | varchar | nullable |
| createdAt | timestamptz | |

### Project
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | varchar | |
| description | text | nullable |
| createdAt | timestamptz | |

### ProjectMember
Join table between User and Project.

| Field | Type | Notes |
|---|---|---|
| userId | UUID | FK → users |
| projectId | UUID | FK → projects |
| role | enum | `ADMIN`, `PM`, `DEVELOPER`, `TESTER` |
| joinedAt | timestamptz | |

### UserStory
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| projectId | UUID | FK → projects |
| title | varchar | |
| description | text | |
| priority | enum | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` |
| status | enum | `DRAFT`, `ACTIVE`, `DEPRECATED` |
| createdAt / updatedAt | timestamptz | |

### VerificationStep
Ordered steps that testers execute for a story.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| storyId | UUID | FK → user_stories |
| order | int | |
| instruction | text | |

### Release
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| projectId | UUID | FK → projects |
| name | varchar | |
| status | enum | `DRAFT`, `CLOSED` |
| closedAt | timestamptz | nullable |
| createdAt | timestamptz | |

### ReleaseStory (snapshot)
Immutable copy of a UserStory created when a release is closed. Edits to master stories never affect this row.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| releaseId | UUID | FK → releases |
| sourceStoryId | UUID | FK → user_stories |
| title | varchar | frozen copy |
| description | text | frozen copy |
| priority | enum | frozen copy |
| steps | ReleaseStoryStep[] | |

### ReleaseStoryStep (snapshot)
Immutable copy of a VerificationStep.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| releaseStoryId | UUID | FK → release_stories |
| order | int | |
| instruction | text | frozen copy |

### TestExecution
One row per test attempt. Append-only — completed executions are never modified.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| releaseId | UUID | FK → releases |
| releaseStoryId | UUID | FK → release_stories |
| assignedToUserId | UUID | FK → users |
| attempt | int | incremented per story per release |
| status | enum | See TestStatus below |
| startedAt | timestamptz | |
| completedAt | timestamptz | nullable |
| comment | text | nullable |

### StepResult
Per-step verdict within a TestExecution.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| executionId | UUID | FK → test_executions |
| releaseStoryStepId | UUID | FK → release_story_steps |
| status | enum | `PASS`, `FAIL`, `SKIPPED` |
| comment | text | nullable |

### Bug
Created automatically when a test is submitted as `Fail`.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| projectId | UUID | FK → projects |
| storyId | UUID | FK → user_stories (master) |
| executionId | UUID | FK → test_executions |
| title | varchar | |
| description | text | |
| severity | enum | `CRITICAL`, `MAJOR`, `MINOR`, `TRIVIAL` |
| status | enum | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `REOPENED` |
| reportedById | UUID | FK → users |
| assignedToId | UUID | FK → users, nullable |
| createdAt / updatedAt | timestamptz | |

### Attachment
File references stored in MinIO.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| originalName | varchar | |
| mimeType | varchar | |
| size | int | bytes |
| storageKey | varchar | MinIO object key |
| entityType | enum | `STORY`, `BUG` |
| entityId | UUID | polymorphic FK |
| uploadedById | UUID | FK → users |
| createdAt | timestamptz | |

## Playwright Automation Entities

### PlaywrightTest
Metadata for a Playwright test registered from an external project.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| projectId | UUID | FK → projects |
| externalId | varchar | stable ID from external project |
| testFile | varchar | e.g., `tests/auth/login.spec.ts` |
| testName | varchar | e.g., `should login with valid credentials` |
| tags | text[] | optional |
| lastSyncedAt | timestamptz | |

**Unique constraint**: `(projectId, externalId)`

### StoryTestLink
N:N join between UserStory and PlaywrightTest.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| storyId | UUID | FK → user_stories, CASCADE delete |
| testId | UUID | FK → playwright_tests, CASCADE delete |
| linkedBy | enum | `USER` (manual) or `AUTO_DISCOVERY` |
| createdAt | timestamptz | |

**Unique constraint**: `(storyId, testId)`

### AutomationRun
One row per Playwright test execution. Append-only.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| projectId | UUID | FK → projects |
| testId | UUID | FK → playwright_tests |
| releaseId | UUID | FK → releases, nullable |
| status | enum | See AutomationRunStatus below |
| triggeredBy | enum | `UI`, `CI_CD` |
| duration | int | milliseconds, nullable |
| startedAt | timestamptz | |
| completedAt | timestamptz | nullable |
| errorMessage | text | nullable |
| logs | text | nullable |
| externalRunId | varchar | CI job URL, nullable |
| createdAt | timestamptz | |

### ProjectRepoConfig
Git repository settings per project for running Playwright tests.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| projectId | UUID | FK → projects, unique |
| repoUrl | varchar | HTTPS or SSH clone URL |
| branch | varchar | default: `main` |
| testDirectory | varchar | default: `tests/` |
| playwrightConfig | varchar | nullable — auto-detected if omitted |
| authToken | varchar | AES-256-GCM encrypted PAT |

## Enums

```typescript
enum UserRole         { ADMIN, PM, DEVELOPER, TESTER }
enum Priority         { CRITICAL, HIGH, MEDIUM, LOW }
enum StoryStatus      { DRAFT, ACTIVE, DEPRECATED }
enum ReleaseStatus    { DRAFT, CLOSED }
enum TestStatus       { UNTESTED, IN_PROGRESS, PASS, FAIL, PARTIALLY_TESTED, CANT_BE_TESTED }
enum StepStatus       { PASS, FAIL, SKIPPED }
enum BugSeverity      { CRITICAL, MAJOR, MINOR, TRIVIAL }
enum BugStatus        { OPEN, IN_PROGRESS, RESOLVED, CLOSED, REOPENED }
enum AutomationRunStatus {
  QUEUED, CLONING, INSTALLING, RUNNING,
  PASS, FAIL, ERROR, SKIPPED, TIMEOUT, CANCELLED
}
enum AutomationTrigger { UI, CI_CD }
enum LinkSource        { USER, AUTO_DISCOVERY }
```

## Key Design Decisions

- **Snapshot pattern**: `ReleaseStory` / `ReleaseStoryStep` are frozen copies. Edits to master stories after a release is closed have zero effect on in-progress testing.
- **Append-only execution log**: `TestExecution` rows are never updated once completed. Every retry creates a new row with an incremented `attempt` number.
- **Conflict detection at read time**: No separate conflict entity. The API computes conflict status when you query `GET /stories/:id/automation/summary` by comparing the latest manual `TestExecution` result against the latest `AutomationRun` result.
- **All IDs are UUID v4**: Never auto-increment integers.
- **Timestamps in ISO 8601**: Stored as `timestamptz` in PostgreSQL.
- **Hard deletes**: Soft-delete is not used.
