# Veriflow — Project Specification

## 1. Vision

**"The Requirement IS the Test Case."**

Veriflow is a manual release validation platform that replaces spreadsheet-based QA tracking with a real-time collaborative tool. Every User Story doubles as its test script — write it once, verify it everywhere.

## 2. Core Concepts

### Users & Identity
- Users exist globally (single account across all projects).
- Users are assigned to **Projects** with a specific **Role**.
- **Roles**: `Admin`, `PM`, `Developer`, `Tester`.

### User Story (The Core Unit)
A User Story is both the feature requirement and the test case.

| Field | Required | Description |
|---|---|---|
| Title | Yes | Short name of the feature |
| Description | Yes | The requirement / acceptance criteria |
| Verification Steps | Yes | Ordered steps that testers execute |
| Priority | Yes | `Critical`, `High`, `Medium`, `Low` |
| Attachments | No | Supporting files (future scope) |

**Lifecycle**: `Draft` → `Active` → `Deprecated`

### Release Management
A Release groups User Stories into a testable scope.

| State | Behavior |
|---|---|
| **Draft** | Stories can be added or removed. No testing. |
| **Closed** | Scope is frozen. A snapshot of each story and its steps is created. Testing can begin. |

On close, the system creates immutable copies (`ReleaseStory` / `ReleaseStoryStep`) so edits to master stories never affect in-progress testing.

### Test Execution
Each test attempt against a story in a release is recorded as its own row — full history is preserved.

| Status | Meaning |
|---|---|
| `Untested` | Default. No tester has started this. |
| `In Progress` | Locked by an active tester. |
| `Pass` | All verification steps confirmed. |
| `Fail` | One or more steps failed. Creates a Bug. |
| `Partially Tested` | Not all steps could be verified. |
| `Can't Be Tested` | Blocked by external dependency. |

### Bug / Defect
When a tester marks a story as `Fail`, a **Bug** entity is created.

| Field | Description |
|---|---|
| Title | Short summary of the defect |
| Description | What went wrong, expected vs actual |
| Severity | `Critical`, `Major`, `Minor`, `Trivial` |
| Status | `Open` → `In Progress` → `Resolved` → `Closed` / `Reopened` |
| Linked Story | The User Story that failed |
| Linked Execution | The specific test attempt that produced it |
| Reported By | The tester who found it |

## 3. Real-Time Test Runner ("Test Swarm")

### How It Works
1. A release is **Closed** (scope frozen).
2. Testers enter the **Test Runner** for that release.
3. Each tester joins a WebSocket room (`release:{releaseId}`).
4. Tester requests work → server finds an `Untested` story, locks it to `In Progress`, and assigns it.
5. Tester executes each verification step, marking pass/fail per step.
6. Tester submits a final verdict. If `Fail`, a Bug is created.
7. Dashboard updates in real-time for all participants.

### Concurrency Rules
- A story can only be assigned to **one tester** at a time.
- Assignment is atomic — no double-booking.
- If no `Untested` stories remain, the tester is told the pool is empty.

### Disconnect Handling
- Client sends a **heartbeat** on a fixed interval.
- If the server detects no heartbeat within a timeout window, the story is **unlocked**.
- All partial work (step progress, draft comments) is **discarded**.
- Story reverts to `Untested` and re-enters the pool.

## 4. Data Model

### Entities

```
Project
  ├── id, name, description, createdAt
  │
  ├── ProjectMember (join)
  │     ├── userId, projectId, role
  │
  ├── UserStory
  │     ├── id, projectId, title, description, priority, status
  │     └── VerificationStep
  │           ├── id, storyId, order, instruction
  │
  ├── Release
  │     ├── id, projectId, name, status (DRAFT | CLOSED)
  │     │
  │     ├── ReleaseStory (snapshot)
  │     │     ├── id, releaseId, sourceStoryId, title, description, priority
  │     │     └── ReleaseStoryStep (snapshot)
  │     │           ├── id, releaseStoryId, order, instruction
  │     │
  │     └── TestExecution (log — one row per attempt)
  │           ├── id, releaseId, releaseStoryId, attempt
  │           ├── status, assignedToUserId
  │           ├── startedAt, completedAt, comment
  │           └── StepResult
  │                 ├── id, executionId, releaseStoryStepId
  │                 ├── status (PASS | FAIL | SKIPPED)
  │                 └── comment
  │
  └── Bug
        ├── id, projectId, storyId, executionId
        ├── title, description, severity, status
        ├── reportedById, assignedToId
        ├── createdAt, updatedAt
```

### Key Relationships
- `TestExecution` → `ReleaseStory` (what was tested)
- `TestExecution` → `User` (who tested it)
- `Bug` → `UserStory` (the master story that failed)
- `Bug` → `TestExecution` (the specific attempt that found it)
- `StepResult` → `ReleaseStoryStep` (per-step verdict)
- `StoryTestLink` → `UserStory` + `PlaywrightTest` (N:N mapping)
- `AutomationRun` → `PlaywrightTest` (which test was executed)
- `AutomationRun` → `UserStory` (which story it covers, via link)
- `AutomationRun` → `Release` (optional — if targeting a specific release)

### Playwright Automation Entities

```
PlaywrightTest
  ├── id, projectId, externalId, testFile, testName
  ├── tags[], lastSyncedAt, createdAt, updatedAt
  │
  ├── StoryTestLink (join — N:N)
  │     ├── id, storyId, testId, linkedBy (USER | AUTO_DISCOVERY)
  │     ├── createdAt
  │
  └── AutomationRun (one row per test execution)
        ├── id, projectId, testId, releaseId (nullable)
        ├── status (PASS | FAIL | ERROR | SKIPPED)
        ├── triggeredBy (UI | CI_CD | REGISTRY_SYNC)
        ├── duration (ms), startedAt, completedAt
        ├── errorMessage (nullable), logs (nullable)
        ├── externalRunId (nullable — CI job ID)
        ├── createdAt
```

#### PlaywrightTest
Represents a single Playwright test case registered from an external project.

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID (PK) | Auto | Internal ID |
| projectId | UUID (FK) | Yes | Parent project |
| externalId | varchar | Yes | Stable identifier from the external project (unique per project) |
| testFile | varchar | Yes | File path (e.g., `tests/auth/login.spec.ts`) |
| testName | varchar | Yes | Test name (e.g., `should login with valid credentials`) |
| tags | text[] | No | Optional tags for categorization |
| lastSyncedAt | timestamptz | Yes | Last time this test was reported by the registry |
| createdAt | timestamptz | Auto | |
| updatedAt | timestamptz | Auto | |

**Unique constraint**: `(projectId, externalId)`

#### StoryTestLink
N:N join between User Stories and Playwright tests.

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID (PK) | Auto | |
| storyId | UUID (FK) | Yes | References `user_stories`, CASCADE delete |
| testId | UUID (FK) | Yes | References `playwright_tests`, CASCADE delete |
| linkedBy | enum | Yes | `USER` (manual) or `AUTO_DISCOVERY` (from annotations) |
| createdAt | timestamptz | Auto | |

**Unique constraint**: `(storyId, testId)`

#### AutomationRun
One row per Playwright test execution. Append-only like TestExecution.

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID (PK) | Auto | |
| projectId | UUID (FK) | Yes | Parent project |
| testId | UUID (FK) | Yes | References `playwright_tests` |
| releaseId | UUID (FK) | No | If targeting a specific release |
| status | enum | Yes | `QUEUED`, `CLONING`, `INSTALLING`, `RUNNING`, `PASS`, `FAIL`, `ERROR`, `SKIPPED`, `TIMEOUT`, `CANCELLED` |
| triggeredBy | enum | Yes | `UI`, `CI_CD` |
| duration | int | No | Duration in milliseconds |
| startedAt | timestamptz | Yes | |
| completedAt | timestamptz | No | |
| errorMessage | text | No | Failure message / stack trace |
| logs | text | No | Stdout/stderr output |
| externalRunId | varchar | No | CI job URL or run ID |
| createdAt | timestamptz | Auto | |

### Conflict Detection
When a User Story has both manual TestExecution results and AutomationRun results (via linked tests), and they disagree (e.g., manual = PASS, automation = FAIL), the system flags a **conflict**. Conflicts are computed at read time — no separate entity. The story detail and release dashboard show a conflict indicator prompting human review.

## 5. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 |
| Backend | NestJS 11 |
| Database | PostgreSQL + TypeORM |
| Real-time | Socket.io (NestJS Gateway) |
| Auth | JWT (access + refresh tokens) |
| Package Manager | npm |

## 6. API Design

### Conventions
- **Base URL**: `/api/v1`
- **Auth**: Bearer token in `Authorization` header (all routes except auth)
- **Content-Type**: `application/json`
- **IDs**: UUID v4
- **Timestamps**: ISO 8601 (`2026-02-14T12:00:00.000Z`)
- **Pagination**: `?page=1&limit=20` → response includes `{ data, meta: { total, page, limit, totalPages } }`
- **Errors**: `{ statusCode, message, error }`

---

### Auth

#### `POST /auth/register`
```json
// Request
{ "email": "user@example.com", "password": "securePass1!", "name": "Jane Doe" }

// Response 201
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

#### `POST /auth/login`
```json
// Request
{ "email": "user@example.com", "password": "securePass1!" }

// Response 200
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

#### `POST /auth/refresh`
```json
// Request
{ "refreshToken": "eyJ..." }

// Response 200
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

#### `GET /auth/me`
```json
// Response 200
{ "id": "uuid", "email": "user@example.com", "name": "Jane Doe", "createdAt": "..." }
```

---

### Projects

#### `POST /projects`
**Roles**: Any authenticated user (becomes `Admin` of the new project).
```json
// Request
{ "name": "Project Alpha", "description": "Main product release tracking" }

// Response 201
{ "id": "uuid", "name": "Project Alpha", "description": "...", "createdAt": "..." }
```

#### `GET /projects`
Returns projects the authenticated user is a member of.
```json
// Response 200
{
  "data": [
    { "id": "uuid", "name": "Project Alpha", "description": "...", "role": "ADMIN", "createdAt": "..." }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```

#### `GET /projects/:id`
```json
// Response 200
{
  "id": "uuid", "name": "Project Alpha", "description": "...", "createdAt": "...",
  "members": [
    { "userId": "uuid", "name": "Jane Doe", "email": "...", "role": "ADMIN" }
  ]
}
```

#### `POST /projects/:id/members`
**Roles**: `Admin`
```json
// Request
{ "email": "dev@example.com", "role": "DEVELOPER" }

// Response 201
{ "userId": "uuid", "projectId": "uuid", "role": "DEVELOPER" }
```

#### `PATCH /projects/:id/members/:userId`
**Roles**: `Admin`
```json
// Request
{ "role": "TESTER" }

// Response 200
{ "userId": "uuid", "projectId": "uuid", "role": "TESTER" }
```

#### `DELETE /projects/:id/members/:userId`
**Roles**: `Admin`
```
// Response 204 No Content
```

---

### User Stories

#### `POST /projects/:projectId/stories`
**Roles**: `Admin`, `PM`, `Developer`
```json
// Request
{
  "title": "Login Page",
  "description": "User can log in with email and password",
  "priority": "HIGH",
  "steps": [
    { "order": 1, "instruction": "Navigate to /login" },
    { "order": 2, "instruction": "Enter valid email" },
    { "order": 3, "instruction": "Enter valid password" },
    { "order": 4, "instruction": "Click Login button" },
    { "order": 5, "instruction": "Verify dashboard loads" }
  ]
}

// Response 201
{
  "id": "uuid", "projectId": "uuid",
  "title": "Login Page", "description": "...",
  "priority": "HIGH", "status": "DRAFT",
  "steps": [
    { "id": "uuid", "order": 1, "instruction": "Navigate to /login" }
  ],
  "createdAt": "...", "updatedAt": "..."
}
```

#### `GET /projects/:projectId/stories`
**Query params**: `?status=ACTIVE&priority=HIGH&search=login&page=1&limit=20`
```json
// Response 200
{
  "data": [
    { "id": "uuid", "title": "Login Page", "priority": "HIGH", "status": "ACTIVE", "stepCount": 5, "createdAt": "..." }
  ],
  "meta": { "total": 12, "page": 1, "limit": 20, "totalPages": 1 }
}
```

#### `GET /stories/:id`
```json
// Response 200
{
  "id": "uuid", "projectId": "uuid",
  "title": "Login Page", "description": "...",
  "priority": "HIGH", "status": "ACTIVE",
  "steps": [
    { "id": "uuid", "order": 1, "instruction": "Navigate to /login" }
  ],
  "createdAt": "...", "updatedAt": "..."
}
```

#### `PATCH /stories/:id`
**Roles**: `Admin`, `PM`, `Developer`
```json
// Request (partial update — all fields optional)
{
  "title": "Login Page v2",
  "steps": [
    { "id": "existing-uuid", "order": 1, "instruction": "Updated instruction" },
    { "order": 2, "instruction": "New step (no id = create)" }
  ]
}

// Response 200
{ "id": "uuid", "title": "Login Page v2", "..." }
```
Steps without an `id` are created. Existing steps not included in the array are deleted.

#### `DELETE /stories/:id`
**Roles**: `Admin`, `PM`
```
// Response 204 No Content
```

---

### Releases

#### `POST /projects/:projectId/releases`
**Roles**: `Admin`, `PM`
```json
// Request
{ "name": "v1.0" }

// Response 201
{ "id": "uuid", "projectId": "uuid", "name": "v1.0", "status": "DRAFT", "createdAt": "..." }
```

#### `GET /projects/:projectId/releases`
**Query params**: `?status=DRAFT&page=1&limit=20`
```json
// Response 200
{
  "data": [
    { "id": "uuid", "name": "v1.0", "status": "DRAFT", "storyCount": 5, "createdAt": "..." }
  ],
  "meta": { "..." }
}
```

#### `GET /releases/:id`
```json
// Response 200
{
  "id": "uuid", "name": "v1.0", "status": "CLOSED", "createdAt": "...", "closedAt": "...",
  "stories": [
    {
      "id": "release-story-uuid", "sourceStoryId": "uuid",
      "title": "Login Page", "priority": "HIGH",
      "steps": [
        { "id": "uuid", "order": 1, "instruction": "Navigate to /login" }
      ],
      "latestExecution": {
        "status": "PASS", "attempt": 2, "testerName": "Jane Doe", "completedAt": "..."
      }
    }
  ]
}
```

#### `POST /releases/:id/stories`
**Roles**: `Admin`, `PM`. **Requires**: release status = `DRAFT`.
```json
// Request
{ "storyIds": ["uuid-1", "uuid-2"] }

// Response 201
{ "added": 2 }
```

#### `DELETE /releases/:id/stories/:storyId`
**Roles**: `Admin`, `PM`. **Requires**: release status = `DRAFT`.
```
// Response 204 No Content
```

#### `POST /releases/:id/close`
**Roles**: `Admin`, `PM`. **Requires**: release status = `DRAFT`, at least 1 story.

Freezes the release: creates `ReleaseStory` + `ReleaseStoryStep` snapshots. Irreversible.
```json
// Response 200
{ "id": "uuid", "name": "v1.0", "status": "CLOSED", "closedAt": "...", "storyCount": 5 }
```

---

### Test Execution

#### `GET /releases/:id/executions`
Returns all execution history for the release.

**Query params**: `?storyId=uuid&status=FAIL&page=1&limit=50`
```json
// Response 200
{
  "data": [
    {
      "id": "uuid", "releaseStoryId": "uuid", "storyTitle": "Login Page",
      "attempt": 1, "status": "FAIL",
      "tester": { "id": "uuid", "name": "Jane Doe" },
      "startedAt": "...", "completedAt": "...", "comment": "Button unresponsive"
    }
  ],
  "meta": { "..." }
}
```

#### `GET /releases/:id/executions/latest`
Returns only the latest execution per story — used for the dashboard.
```json
// Response 200
{
  "summary": { "total": 10, "pass": 4, "fail": 2, "untested": 3, "inProgress": 1 },
  "stories": [
    {
      "releaseStoryId": "uuid", "title": "Login Page",
      "status": "FAIL", "attempt": 2,
      "tester": { "id": "uuid", "name": "Jane Doe" },
      "completedAt": "..."
    }
  ]
}
```

#### `GET /executions/:id`
Full detail for a single execution, including step-level results.
```json
// Response 200
{
  "id": "uuid", "releaseStoryId": "uuid", "storyTitle": "Login Page",
  "attempt": 1, "status": "FAIL",
  "tester": { "id": "uuid", "name": "Jane Doe" },
  "startedAt": "...", "completedAt": "...", "comment": "Button unresponsive",
  "stepResults": [
    { "id": "uuid", "order": 1, "instruction": "Navigate to /login", "status": "PASS", "comment": null },
    { "id": "uuid", "order": 2, "instruction": "Enter valid email", "status": "PASS", "comment": null },
    { "id": "uuid", "order": 3, "instruction": "Click Login button", "status": "FAIL", "comment": "Button does nothing" }
  ]
}
```

---

### Bugs

#### `POST /bugs`
Created automatically on `Fail`, but also available manually.

**Roles**: `Admin`, `PM`, `Developer`, `Tester`
```json
// Request
{
  "projectId": "uuid",
  "storyId": "uuid",
  "executionId": "uuid",
  "title": "Login button unresponsive",
  "description": "Expected: dashboard loads. Actual: nothing happens on click.",
  "severity": "MAJOR"
}

// Response 201
{
  "id": "uuid", "projectId": "uuid", "storyId": "uuid", "executionId": "uuid",
  "title": "Login button unresponsive", "description": "...",
  "severity": "MAJOR", "status": "OPEN",
  "reportedBy": { "id": "uuid", "name": "Jane Doe" },
  "assignedTo": null,
  "createdAt": "...", "updatedAt": "..."
}
```

#### `GET /projects/:projectId/bugs`
**Query params**: `?status=OPEN&severity=MAJOR&storyId=uuid&page=1&limit=20`
```json
// Response 200
{
  "data": [
    {
      "id": "uuid", "title": "Login button unresponsive",
      "severity": "MAJOR", "status": "OPEN",
      "storyTitle": "Login Page",
      "reportedBy": { "id": "uuid", "name": "Jane Doe" },
      "assignedTo": null,
      "createdAt": "..."
    }
  ],
  "meta": { "..." }
}
```

#### `GET /bugs/:id`
```json
// Response 200
{
  "id": "uuid", "projectId": "uuid",
  "story": { "id": "uuid", "title": "Login Page" },
  "execution": { "id": "uuid", "attempt": 1, "completedAt": "..." },
  "title": "Login button unresponsive",
  "description": "Expected: dashboard loads. Actual: nothing happens on click.",
  "severity": "MAJOR", "status": "OPEN",
  "reportedBy": { "id": "uuid", "name": "Jane Doe" },
  "assignedTo": null,
  "createdAt": "...", "updatedAt": "..."
}
```

#### `PATCH /bugs/:id`
**Roles**: `Admin`, `PM`, `Developer`
```json
// Request (partial — all fields optional)
{ "status": "IN_PROGRESS", "assignedToId": "uuid", "severity": "CRITICAL" }

// Response 200
{ "id": "uuid", "status": "IN_PROGRESS", "assignedTo": { "id": "uuid", "name": "John Dev" }, "..." }
```

#### `DELETE /bugs/:id`
**Roles**: `Admin`
```
// Response 204 No Content
```

---

### Playwright Automation

#### `POST /projects/:projectId/automation/registry/sync`
**Roles**: `Admin`, `PM`, `Developer`. Syncs the test catalog from an external project. Creates new tests, updates existing, marks stale.
```json
// Request
{
  "tests": [
    {
      "externalId": "auth-login-001",
      "testFile": "tests/auth/login.spec.ts",
      "testName": "should login with valid credentials",
      "tags": ["auth", "smoke"],
      "storyExternalIds": ["story-uuid-1"]
    }
  ]
}

// Response 200
{
  "created": 3,
  "updated": 1,
  "linked": 2
}
```
If `storyExternalIds` are included, auto-links tests to stories (linkedBy = `AUTO_DISCOVERY`).

#### `GET /projects/:projectId/automation/tests`
**Query params**: `?search=login&tags=smoke&linked=true&page=1&limit=20`
```json
// Response 200
{
  "data": [
    {
      "id": "uuid", "externalId": "auth-login-001",
      "testFile": "tests/auth/login.spec.ts",
      "testName": "should login with valid credentials",
      "tags": ["auth", "smoke"],
      "linkedStoryCount": 2,
      "lastRunStatus": "PASS",
      "lastRunAt": "...",
      "lastSyncedAt": "..."
    }
  ],
  "meta": { "..." }
}
```

#### `GET /automation/tests/:id`
```json
// Response 200
{
  "id": "uuid", "projectId": "uuid",
  "externalId": "auth-login-001",
  "testFile": "tests/auth/login.spec.ts",
  "testName": "should login with valid credentials",
  "tags": ["auth", "smoke"],
  "linkedStories": [
    { "id": "uuid", "title": "Login Page", "linkedBy": "AUTO_DISCOVERY" }
  ],
  "recentRuns": [
    { "id": "uuid", "status": "PASS", "duration": 1234, "triggeredBy": "CI_CD", "completedAt": "..." }
  ],
  "lastSyncedAt": "..."
}
```

#### `DELETE /automation/tests/:id`
**Roles**: `Admin`, `PM`.
```
// Response 204 No Content
```

#### `POST /stories/:storyId/automation/link`
**Roles**: `Admin`, `PM`, `Developer`. Manually link tests to a story.
```json
// Request
{ "testIds": ["uuid-1", "uuid-2"] }

// Response 201
{ "linked": 2 }
```

#### `DELETE /stories/:storyId/automation/link/:testId`
**Roles**: `Admin`, `PM`, `Developer`.
```
// Response 204 No Content
```

#### `GET /stories/:storyId/automation/summary`
Returns automation status summary for a story (all linked tests).
```json
// Response 200
{
  "linkedTests": 3,
  "latestResults": {
    "pass": 2, "fail": 1, "error": 0, "skipped": 0
  },
  "conflict": true,
  "conflictDetail": {
    "manualStatus": "PASS",
    "automationStatus": "FAIL",
    "failedTests": [
      { "id": "uuid", "testName": "should reject invalid password", "lastRunAt": "..." }
    ]
  }
}
```

#### `POST /projects/:projectId/automation/runs`
**Roles**: `Admin`, `PM`, `Developer`. Report results from a CI/CD pipeline or trigger a run.
```json
// Request
{
  "triggeredBy": "CI_CD",
  "releaseId": "uuid",
  "results": [
    {
      "externalId": "auth-login-001",
      "status": "PASS",
      "duration": 1234,
      "startedAt": "...",
      "completedAt": "...",
      "externalRunId": "https://github.com/org/repo/actions/runs/123"
    },
    {
      "externalId": "auth-login-002",
      "status": "FAIL",
      "duration": 5678,
      "startedAt": "...",
      "completedAt": "...",
      "errorMessage": "Expected element to be visible",
      "logs": "..."
    }
  ]
}

// Response 201
{ "recorded": 2, "releaseId": "uuid" }
```

#### `GET /projects/:projectId/automation/runs`
**Query params**: `?testId=uuid&releaseId=uuid&status=FAIL&page=1&limit=20`
```json
// Response 200
{
  "data": [
    {
      "id": "uuid", "testName": "should login with valid credentials",
      "status": "PASS", "duration": 1234,
      "triggeredBy": "CI_CD", "externalRunId": "...",
      "startedAt": "...", "completedAt": "..."
    }
  ],
  "meta": { "..." }
}
```

#### `GET /automation/runs/:id`
Full detail for a single automation run.
```json
// Response 200
{
  "id": "uuid",
  "test": { "id": "uuid", "testFile": "...", "testName": "..." },
  "release": { "id": "uuid", "name": "v1.0" },
  "status": "FAIL", "duration": 5678,
  "triggeredBy": "CI_CD",
  "startedAt": "...", "completedAt": "...",
  "errorMessage": "Expected element to be visible",
  "logs": "...",
  "externalRunId": "https://github.com/org/repo/actions/runs/123",
  "linkedStories": [
    { "id": "uuid", "title": "Login Page" }
  ]
}
```

#### `POST /projects/:projectId/automation/trigger`
**Roles**: `Admin`, `PM`, `Developer`. Trigger Playwright test execution from the UI.
```json
// Request
{
  "testIds": ["uuid-1", "uuid-2"],
  "baseUrl": "https://staging.example.com",
  "releaseId": "uuid"
}

// Response 202
{
  "batchId": "uuid",
  "runs": [
    { "id": "uuid", "testId": "uuid-1", "status": "QUEUED" },
    { "id": "uuid", "testId": "uuid-2", "status": "QUEUED" }
  ]
}
```

#### `GET /automation/runs/:id/status`
Poll for run progress (alternative to WebSocket updates).
```json
// Response 200
{
  "id": "uuid",
  "status": "RUNNING",
  "phase": "RUNNING",
  "startedAt": "...",
  "logs": "Running 1 test using 1 worker..."
}
```

#### `POST /projects/:projectId/automation/tunnel`
**Roles**: `Admin`, `PM`, `Developer`. Register a tunnel endpoint for local testing.
```json
// Request
{ "localPort": 3000 }

// Response 201
{
  "tunnelId": "uuid",
  "tunnelUrl": "https://abc123.tunnel.veriflow.local",
  "expiresAt": "..."
}
```

#### `DELETE /automation/tunnel/:tunnelId`
Tear down a tunnel session.
```
// Response 204 No Content
```

#### Role Permissions (Automation)

| Action | Admin | PM | Developer | Tester |
|---|---|---|---|---|
| Sync test registry | Yes | Yes | Yes | No |
| Link/unlink tests to stories | Yes | Yes | Yes | No |
| Report automation results | Yes | Yes | Yes | No |
| View automation results | Yes | Yes | Yes | Yes |
| Delete tests from registry | Yes | Yes | No | No |
| Trigger runs from UI | Yes | Yes | Yes | No |
| Create tunnel | Yes | Yes | Yes | No |

### Test Execution Infrastructure

#### Git Repository Configuration
Each project can configure a source repository for Playwright tests in project settings:

| Field | Required | Description |
|---|---|---|
| repoUrl | Yes | Git clone URL (HTTPS or SSH) |
| branch | No | Branch to clone (default: `main`) |
| testDirectory | No | Path to Playwright tests (default: `tests/`) |
| playwrightConfig | No | Path to `playwright.config.ts` (default: auto-detect) |
| authToken | No | Personal access token or deploy key for private repos (encrypted at rest) |

#### Test Worker Service
A dedicated microservice responsible for executing Playwright tests. Runs as a separate Docker container alongside the main API.

**Responsibilities**:
1. Receive job from API (via job queue)
2. Clone the configured git repository (with caching for repeated runs)
3. Install dependencies (`npm ci`)
4. Configure `baseURL` (public URL or tunnel URL)
5. Execute Playwright tests (`npx playwright test --reporter=json`)
6. Parse JSON reporter output
7. Report results back to Veriflow API
8. Clean up working directory

**Worker environment**:
- Docker container with Node.js + Playwright + browser binaries pre-installed
- Isolated filesystem per run (no cross-contamination between projects)
- Configurable concurrency (max simultaneous runs)
- Timeout per run (default: 10 minutes)

#### AutomationRun Status Lifecycle
```
QUEUED → CLONING → INSTALLING → RUNNING → PASS / FAIL / ERROR
                                         └→ TIMEOUT (if exceeded max duration)
                                         └→ CANCELLED (if user cancels)
```

#### Job Queue
Communication between Veriflow API and Test Worker:
- **Technology**: Bull (Redis-backed) for reliable job processing
- **Job payload**: `{ runId, repoUrl, branch, testDirectory, testFile, testName, baseUrl, authToken }`
- **Job events**: `active`, `completed`, `failed` → update AutomationRun status
- **Retry policy**: No automatic retry — user can manually re-trigger
- **Priority**: Jobs are FIFO per project

#### Veriflow CLI (Tunnel)
An npm package (`@veriflow/cli`) that developers install to expose local apps for automated testing.

**Usage**:
```bash
npx @veriflow/cli tunnel --port 3000 --project <projectId> --token <apiToken>
```

**How it works**:
1. CLI authenticates with Veriflow API using the provided token
2. Establishes a WebSocket connection to Veriflow's tunnel server
3. Veriflow assigns a unique tunnel URL (e.g., `https://<session>.tunnel.veriflow.local`)
4. Incoming HTTP requests to the tunnel URL are forwarded over the WebSocket to the CLI
5. CLI forwards requests to `localhost:<port>` and returns responses
6. Tunnel stays active as long as the CLI process runs
7. On disconnect, the tunnel URL is invalidated

**Security**:
- Tunnel URLs are random and unguessable (UUID-based)
- Only the Veriflow test worker can route traffic through tunnels
- Tunnels expire after a configurable timeout (default: 2 hours)
- Encrypted WebSocket connection (WSS)

---

### WebSocket Events

All events flow through a Socket.io namespace. Client authenticates via token on connection.

**Connection**: `io("/test-runner", { auth: { token: "eyJ..." } })`

#### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join-session` | `{ releaseId }` | Join the testing room for a release |
| `leave-session` | `{ releaseId }` | Leave the testing room |
| `request-work` | `{ releaseId }` | Ask for the next untested story |
| `update-step` | `{ executionId, stepId, status, comment? }` | Submit a step-level result |
| `submit-result` | `{ executionId, status, comment?, bug?: { title, description, severity } }` | Final verdict. If `FAIL` with `bug`, a Bug is created. |
| `heartbeat` | `{ releaseId }` | Keep-alive ping (every 15s) |

#### Server → Client

| Event | Payload | Description |
|---|---|---|
| `story-assigned` | `{ executionId, releaseStory: { id, title, steps[] } }` | Story locked and sent to tester |
| `pool-empty` | `{ releaseId }` | No untested stories remain |
| `error` | `{ message }` | Something went wrong |

#### Server → Room (broadcast to all in release)

| Event | Payload | Description |
|---|---|---|
| `status-changed` | `{ releaseStoryId, status, testerName, attempt }` | A story's test status changed |
| `tester-joined` | `{ userId, name }` | A tester entered the session |
| `tester-left` | `{ userId, name, unlockedStoryId? }` | Tester left/disconnected. Locked story reverts to `Untested`. |
| `dashboard-update` | `{ summary: { total, pass, fail, untested, inProgress } }` | Aggregated stats refresh |

---

### Error Responses

```json
// 400 Bad Request
{ "statusCode": 400, "message": "Validation failed", "errors": [{ "field": "email", "message": "must be a valid email" }] }

// 401 Unauthorized
{ "statusCode": 401, "message": "Invalid or expired token" }

// 403 Forbidden
{ "statusCode": 403, "message": "Insufficient permissions" }

// 404 Not Found
{ "statusCode": 404, "message": "Story not found" }

// 409 Conflict
{ "statusCode": 409, "message": "Release is already closed" }
```

---

### Role Permissions Matrix

| Action | Admin | PM | Developer | Tester |
|---|---|---|---|---|
| Create/edit project | Yes | No | No | No |
| Manage members | Yes | No | No | No |
| Create/edit stories | Yes | Yes | Yes | No |
| Delete stories | Yes | Yes | No | No |
| Create/edit releases | Yes | Yes | No | No |
| Close release | Yes | Yes | No | No |
| Execute tests | Yes | Yes | Yes | Yes |
| Create bugs (manual) | Yes | Yes | Yes | Yes |
| Manage bugs | Yes | Yes | Yes | No |
| Delete bugs | Yes | No | No | No |

## 7. Logging

### Strategy
Use NestJS built-in `Logger` for all server-side logging. No external logging library needed initially.

### Log Levels

| Level | Usage |
|---|---|
| `error` | Unhandled exceptions, DB connection failures, critical path failures |
| `warn` | Recoverable issues — invalid tokens, permission denials, release already closed |
| `log` | Key business events — user registered, release closed, bug created |
| `debug` | Request/response details, query params, WebSocket event payloads |
| `verbose` | Internal state — heartbeat ticks, lock/unlock cycles, snapshot step counts |

### What to Log

**Always log** (level `log`):
- Auth events: login success/failure, token refresh, registration
- Mutation operations: entity created, updated, deleted (with entity type + ID)
- Release lifecycle: release closed, snapshots created (with story count)
- Test runner events: story assigned, result submitted, bug auto-created
- Disconnect cleanup: story unlocked due to timeout (with user ID + story ID)

**Never log**:
- Passwords, tokens, or refresh tokens
- Full request/response bodies in production (use `debug` level only)
- PII beyond user ID in production logs

### Log Format
```
[Nest] 12345  - 02/14/2026, 12:00:00 PM  LOG [ReleasesService] Release closed: id=abc-123, project=def-456, stories=12
[Nest] 12345  - 02/14/2026, 12:00:01 PM  WARN [AuthGuard] Invalid token: userId=ghi-789, reason=expired
[Nest] 12345  - 02/14/2026, 12:00:02 PM  LOG [TestRunnerGateway] Story assigned: release=abc-123, story=jkl-012, tester=mno-345
[Nest] 12345  - 02/14/2026, 12:00:15 PM  WARN [TestRunnerGateway] Heartbeat timeout: release=abc-123, tester=mno-345, unlocked=jkl-012
```

### Per-Module Logger
Each service/gateway creates its own logger instance:
```typescript
private readonly logger = new Logger(ReleasesService.name);
```

---

## 8. Naming Conventions

### Files & Directories

| Context | Convention | Example |
|---|---|---|
| NestJS modules | kebab-case | `user-stories/`, `test-execution/` |
| NestJS files | kebab-case + suffix | `user-stories.controller.ts`, `user-stories.service.ts` |
| TypeORM entities | kebab-case + `.entity.ts` | `user-story.entity.ts`, `release-story.entity.ts` |
| DTOs | kebab-case + `.dto.ts` | `create-story.dto.ts`, `update-bug.dto.ts` |
| Guards / Pipes | kebab-case + suffix | `roles.guard.ts`, `validation.pipe.ts` |
| Next.js pages | kebab-case (App Router) | `app/projects/[id]/stories/page.tsx` |
| React components | PascalCase | `StoryCard.tsx`, `ReleaseDashboard.tsx` |
| Hooks | camelCase with `use` prefix | `useStories.ts`, `useTestRunner.ts` |
| Utilities | camelCase | `format-date.ts`, `parse-query.ts` |

### Code

| Context | Convention | Example |
|---|---|---|
| Classes | PascalCase | `UserStoriesService`, `ReleasesController` |
| Interfaces / Types | PascalCase (no `I` prefix) | `CreateStoryDto`, `PaginatedResponse` |
| Functions / Methods | camelCase | `findByProject()`, `closeRelease()` |
| Variables | camelCase | `storyCount`, `releaseId` |
| Constants | UPPER_SNAKE_CASE | `HEARTBEAT_INTERVAL`, `MAX_PAGE_SIZE` |
| Enums | PascalCase name, UPPER_SNAKE_CASE members | `ReleaseStatus.DRAFT`, `TestStatus.IN_PROGRESS` |
| DB tables | snake_case (plural) | `user_stories`, `release_stories`, `test_executions` |
| DB columns | snake_case | `project_id`, `created_at`, `assigned_to_id` |
| API JSON keys | camelCase | `projectId`, `createdAt`, `storyCount` |
| WebSocket events | kebab-case | `join-session`, `request-work`, `status-changed` |
| Environment vars | UPPER_SNAKE_CASE | `DATABASE_URL`, `JWT_SECRET`, `PORT` |

### NestJS Module Structure
```
server/src/
  ├── auth/
  │     ├── auth.module.ts
  │     ├── auth.controller.ts
  │     ├── auth.service.ts
  │     ├── auth.guard.ts
  │     ├── dto/
  │     │     ├── register.dto.ts
  │     │     └── login.dto.ts
  │     └── entities/
  │           └── user.entity.ts
  ├── projects/
  │     ├── projects.module.ts
  │     ├── projects.controller.ts
  │     ├── projects.service.ts
  │     ├── dto/
  │     └── entities/
  │           ├── project.entity.ts
  │           └── project-member.entity.ts
  ├── user-stories/
  ├── releases/
  ├── test-execution/
  ├── bugs/
  ├── automation/
  └── common/
        ├── decorators/
        ├── guards/
        ├── pipes/
        └── interceptors/
```

---

## 9. Development Phases

### Phase 1 — Foundation
- Auth system (register, login, JWT)
- Project CRUD + member management
- User Story CRUD + verification steps
- Role-based access control

### Phase 2 — Release Engine
- Release CRUD (draft state)
- Story-to-release scoping
- Release close → snapshot creation (freeze)
- Release dashboard (read-only view of frozen scope)

### Phase 3 — Test Runner
- WebSocket gateway setup
- Real-time story assignment (lock/unlock)
- Step-by-step execution flow
- Heartbeat + disconnect cleanup
- Live dashboard updates

### Phase 4 — Defect Tracking
- Bug creation on test failure
- Bug lifecycle (Open → Resolved → Closed / Reopened)
- Bug list views per project and per story

### Phase 5 — Polish
- Pagination, filtering, search across entities
- Notifications (in-app)
- Reporting / export
- Attachments (file upload for stories and bugs)

### Phase 6 — Playwright Automation Integration
- Playwright test registry (external projects push available tests via API)
- N:N linking between User Stories and Playwright tests (manual + auto-discovery)
- Automation run execution (trigger from UI + CI/CD result reporting)
- Automation results display (summary card + drill-down on story/release pages)
- Release-aware automation runs (optionally tied to a specific release)
- Conflict detection (flag when manual and automated results disagree)
- Test Worker service (separate microservice: git clone, install, run Playwright, report results)
- Veriflow CLI with built-in tunnel for testing local/private apps
- Job queue (API → Worker communication for test execution)
