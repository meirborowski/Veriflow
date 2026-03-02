# Veriflow — Architecture

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Next.js 16)                  │
│                        Port 3000                            │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Pages/   │  │  Hooks/  │  │  Context  │  │ Socket.io │  │
│  │  Layouts  │  │  Fetch   │  │  (Auth)   │  │  Client   │  │
│  └────┬─────┘  └────┬─────┘  └────┬──────┘  └─────┬─────┘  │
│       │              │             │               │         │
└───────┼──────────────┼─────────────┼───────────────┼─────────┘
        │  REST (HTTP) │             │   WebSocket   │
        ▼              ▼             ▼               ▼
┌───────┼──────────────┼─────────────┼───────────────┼─────────┐
│       │              │             │               │         │
│  ┌────┴─────┐  ┌─────┴────┐  ┌────┴──────┐  ┌────┴──────┐  │
│  │Controllers│  │  Guards  │  │  Services │  │  Gateway  │  │
│  │(Routes)   │  │(Auth/Role│  │ (Business │  │(Socket.io)│  │
│  └────┬─────┘  └──────────┘  │  Logic)   │  └─────┬─────┘  │
│       │                      └─────┬──────┘        │         │
│       └────────────────────────────┼───────────────┘         │
│                                    │                         │
│                             ┌──────┴──────┐                  │
│                             │  TypeORM    │                  │
│                             │ Repositories│                  │
│                             └──────┬──────┘                  │
│                                    │                         │
│                 Server (NestJS 11) │ Port 3001               │
└────────────────────────────────────┼─────────────────────────┘
                                     │
                              ┌──────┴──────┐
                              │ PostgreSQL  │
                              │  Database   │
                              └─────────────┘
```

## 2. Development Environment

```
docker compose up --build
  │
  ├── db (postgres:16-alpine)
  │     Port 5432 │ Named volume: pgdata
  │     Health check: pg_isready
  │
  ├── server (node:20.12.2-alpine)
  │     Port 3001 │ Depends on: db (healthy)
  │     Volume: ./server → /app (hot-reload)
  │     CMD: npm run start:dev
  │
  ├── client (node:20.12.2-alpine)
  │     Port 3000 │ Depends on: server
  │     Volume: ./client → /app (hot-reload)
  │     CMD: npm run dev
  │
  ├── redis (redis:7-alpine)
  │     Port 6379 │ Bull job queue backend
  │     Health check: redis-cli ping
  │
  └── worker (mcr.microsoft.com/playwright)
        No exposed port │ Depends on: redis (healthy), server
        Playwright + browsers pre-installed
        Bull queue consumer (processes test execution jobs)
        CMD: npm run start
```

Source directories are volume-mounted into containers. Anonymous volumes preserve container `node_modules` so host and container dependencies stay independent. Edit files on the host and changes are picked up automatically.

## 3. Server Architecture

### Layer Responsibilities

```
Request → Controller → Service → Repository → Database
                ↓           ↓
             Guards      TypeORM
            (Auth,       Entities
             Roles)
```

| Layer | Responsibility | Rules |
|---|---|---|
| **Controller** | Parse request, validate DTO, return response | No business logic. Delegates to service. |
| **Guard** | Auth verification, role checking | Runs before controller. Rejects unauthorized requests. |
| **Service** | All business logic, orchestration | Single source of truth for domain rules. |
| **Repository** | Data access via TypeORM | Query building, relations, transactions. |
| **Entity** | Database schema definition | Decorators map to PostgreSQL columns. |
| **DTO** | Input validation shapes | class-validator decorators. One per operation. |
| **Gateway** | WebSocket event handling | Thin layer — delegates to services like controllers do. |

### Module Structure

Each domain module follows the same internal structure:

```
server/src/<module>/
  ├── <module>.module.ts          → NestJS module definition
  ├── <module>.controller.ts      → REST endpoints
  ├── <module>.service.ts         → Business logic
  ├── <module>.gateway.ts         → WebSocket handlers (if applicable)
  ├── dto/
  │     ├── create-<entity>.dto.ts
  │     └── update-<entity>.dto.ts
  └── entities/
        └── <entity>.entity.ts    → TypeORM entity
```

### Module Dependency Graph

```
AppModule
  ├── AuthModule (standalone — no domain dependencies)
  │     └── exports: JwtStrategy, AuthGuard
  │
  ├── ProjectsModule
  │     └── depends on: AuthModule
  │
  ├── UserStoriesModule
  │     └── depends on: AuthModule, ProjectsModule
  │
  ├── ReleasesModule
  │     └── depends on: AuthModule, ProjectsModule, UserStoriesModule
  │
  ├── TestExecutionModule
  │     └── depends on: AuthModule, ReleasesModule, BugsModule
  │
  ├── BugsModule
  │     └── depends on: AuthModule, ProjectsModule, UserStoriesModule
  │
  └── AutomationModule
        └── depends on: AuthModule, ProjectsModule, UserStoriesModule, ReleasesModule
```

### Shared / Common Module

```
server/src/common/
  ├── guards/
  │     ├── jwt-auth.guard.ts       → Verifies access token
  │     └── roles.guard.ts          → Checks user role against required roles
  ├── decorators/
  │     ├── roles.decorator.ts      → @Roles('ADMIN', 'PM') metadata decorator
  │     ├── current-user.decorator.ts → @CurrentUser() param decorator
  │     └── public.decorator.ts     → @Public() bypass auth
  ├── pipes/
  │     └── validation.pipe.ts      → Global DTO validation
  ├── interceptors/
  │     └── transform.interceptor.ts → Standardize response shape
  ├── filters/
  │     └── http-exception.filter.ts → Standardize error shape
  └── types/
        ├── pagination.ts           → PaginatedResponse<T>, PaginationQuery
        └── enums.ts                → UserRole, Priority, ReleaseStatus, TestStatus, etc.
```

## 4. Client Architecture

### App Router Structure

```
client/app/
  ├── (auth)/                       → Public layout (no sidebar)
  │     ├── login/page.tsx
  │     └── register/page.tsx
  │
  ├── (dashboard)/                  → Authenticated layout (sidebar + header)
  │     ├── layout.tsx              → Sidebar, project selector, breadcrumbs
  │     ├── projects/
  │     │     ├── page.tsx          → Project list
  │     │     └── [projectId]/
  │     │           ├── page.tsx    → Project overview
  │     │           ├── stories/
  │     │           │     ├── page.tsx        → Story list
  │     │           │     ├── new/page.tsx    → Create story
  │     │           │     └── [storyId]/page.tsx → Story detail/edit
  │     │           ├── releases/
  │     │           │     ├── page.tsx        → Release list
  │     │           │     └── [releaseId]/
  │     │           │           ├── page.tsx  → Release detail + dashboard
  │     │           │           └── runner/page.tsx → Test Runner
  │     │           ├── bugs/
  │     │           │     ├── page.tsx        → Bug list
  │     │           │     └── [bugId]/page.tsx → Bug detail
  │     │           ├── automation/
  │     │           │     ├── page.tsx        → Playwright test registry list
  │     │           │     ├── [testId]/page.tsx → Test detail + run history
  │     │           │     └── runs/
  │     │           │           ├── page.tsx  → Automation runs list
  │     │           │           └── [runId]/page.tsx → Run detail (logs, errors)
  │     │           └── settings/page.tsx     → Members, roles
  │     └── page.tsx                → Redirect to project list
  │
  └── layout.tsx                    → Root layout (providers, fonts)
```

### Client-Side Layers

```
Page (Server Component)
  └── Client Components
        ├── Hooks (data fetching, mutations)
        │     └── fetch() to /api/v1/*
        ├── Context (auth state, current project)
        └── Socket.io Client (test runner only)
```

| Layer | Responsibility |
|---|---|
| **Pages** | Route entry points. Fetch initial data server-side where possible. |
| **Components** | Reusable UI. Accept props, emit events. No direct API calls. |
| **Hooks** | `useFetch` / custom hooks for API calls. Handle loading, error, caching. |
| **Context** | Auth (token, user), active project. Minimal global state. |
| **Socket Client** | Only initialized inside the Test Runner. Connects on mount, disconnects on unmount. |

### Key Client Patterns

- **Auth flow**: Login → store tokens in memory (access) + httpOnly cookie or localStorage (refresh) → attach Bearer header to all requests → redirect to `/projects` on success.
- **Protected routes**: Middleware or layout-level check. Redirect to `/login` if no valid token.
- **API client**: Single `fetch` wrapper that handles token attachment, 401 → refresh → retry, error normalization.
- **Optimistic updates**: Not required for v1. All mutations wait for server confirmation.

## 5. Data Flow Diagrams

### Authentication

```
Client                          Server
  │                               │
  ├── POST /auth/login ──────────►│
  │   { email, password }         │── Validate credentials
  │                               │── Generate access + refresh tokens
  │◄── { accessToken,            │
  │      refreshToken } ─────────│
  │                               │
  ├── GET /api/v1/* ─────────────►│
  │   Authorization: Bearer xxx   │── JwtAuthGuard verifies token
  │                               │── @CurrentUser() extracts user
  │◄── Response ──────────────────│
  │                               │
  ├── POST /auth/refresh ────────►│  (when access token expires)
  │   { refreshToken }            │── Validate refresh token
  │                               │── Rotate: new access + new refresh
  │◄── { accessToken,            │
  │      refreshToken } ─────────│
```

### Release Close (Snapshot)

```
Client                          Server                         Database
  │                               │                               │
  ├── POST /releases/:id/close ──►│                               │
  │                               │── Verify release is DRAFT     │
  │                               │── Verify at least 1 story     │
  │                               │                               │
  │                               │── BEGIN TRANSACTION ──────────►│
  │                               │                               │
  │                               │── For each story in release:  │
  │                               │     Copy → ReleaseStory ─────►│
  │                               │     Copy steps →              │
  │                               │       ReleaseStoryStep ──────►│
  │                               │                               │
  │                               │── Set release.status = CLOSED │
  │                               │── Set release.closedAt = now()│
  │                               │── COMMIT ─────────────────────►│
  │                               │                               │
  │◄── { release } ──────────────│                               │
```

### Test Runner (WebSocket)

```
Tester A          Server              Tester B          Dashboard
   │                 │                    │                  │
   ├─ join-session ─►│                    │                  │
   │  {releaseId}    │── Add to room     │                  │
   │                 ├─ tester-joined ───►│─────────────────►│
   │                 │                    │                  │
   ├─ request-work ─►│                    │                  │
   │                 │── Find untested    │                  │
   │                 │── Lock story       │                  │
   │                 │── Create execution │                  │
   │◄─ story-assigned│                    │                  │
   │  {execution,    │── status-changed ─►│─────────────────►│
   │   story, steps} │                    │                  │
   │                 │                    │                  │
   ├─ update-step ──►│                    │                  │
   │  {stepId, PASS} │── Save step result │                  │
   │                 │                    │                  │
   ├─ submit-result ►│                    │                  │
   │  {status: FAIL, │── Save execution   │                  │
   │   bug: {...}}   │── Create Bug       │                  │
   │                 │── status-changed ──►│─────────────────►│
   │                 │── dashboard-update ►│─────────────────►│
   │                 │                    │                  │
   │  ✕ disconnect   │                    │                  │
   │                 │── Heartbeat timeout │                  │
   │                 │── Unlock story      │                  │
   │                 │── Discard partial   │                  │
   │                 │── tester-left ─────►│─────────────────►│
   │                 │── dashboard-update ►│─────────────────►│
```

### Heartbeat / Disconnect Flow

```
Client                          Server
  │                               │
  ├── heartbeat (every 15s) ─────►│── Update lastSeen for this tester
  ├── heartbeat ─────────────────►│── Update lastSeen
  ├── heartbeat ─────────────────►│── Update lastSeen
  │                               │
  ✕  (client crashes / network)   │
  │                               │── Cron/interval checks lastSeen
  │                               │── If now - lastSeen > 2 minutes:
  │                               │     Unlock assigned story
  │                               │     Delete in-progress execution
  │                               │     Emit tester-left to room
  │                               │     Emit dashboard-update to room
```

## 6. Database Schema (TypeORM Entities)

### Entity Relationship Diagram

```
┌──────────┐       ┌───────────────┐       ┌────────────┐
│   User   │◄──────│ ProjectMember │──────►│  Project   │
│          │  1:N  │               │  N:1  │            │
└──────────┘       └───────────────┘       └─────┬──────┘
     │                                           │ 1:N
     │                              ┌────────────┼────────────┐
     │                              ▼            ▼            ▼
     │                        ┌──────────┐ ┌──────────┐ ┌─────────┐
     │                        │UserStory │ │ Release  │ │   Bug   │
     │                        │          │ │          │ │         │
     │                        └────┬─────┘ └────┬─────┘ └─────────┘
     │                             │ 1:N        │ 1:N        ▲
     │                             ▼            ▼            │
     │                     ┌──────────────┐ ┌──────────────┐ │
     │                     │Verification  │ │ ReleaseStory │ │
     │                     │Step          │ │  (snapshot)  │ │
     │                     └──────────────┘ └──────┬───────┘ │
     │                                             │ 1:N     │
     │                                             ▼         │
     │                                     ┌──────────────┐  │
     │                                     │ReleaseStory  │  │
     │                                     │Step (snapshot)│  │
     │                                     └──────────────┘  │
     │                                             ▲         │
     │         ┌───────────────┐            1:N    │         │
     └────────►│ TestExecution │────────────────────┘         │
        1:N    │  (per attempt)│───────────────────────────────┘
               └───────┬───────┘              creates Bug
                       │ 1:N
                       ▼
               ┌──────────────┐
               │  StepResult  │
               └──────────────┘

                        ┌────────────────┐
         ┌──────────────│ PlaywrightTest │──────────────┐
         │   N:N        │  (registry)    │   1:N        │
         │              └────────────────┘              │
         ▼                                              ▼
  ┌──────────────┐                            ┌─────────────────┐
  │StoryTestLink │                            │ AutomationRun   │
  │ (join table) │                            │ (per execution) │
  └──────┬───────┘                            └────────┬────────┘
         │ N:1                                         │ N:1 (optional)
         ▼                                             ▼
  ┌──────────────┐                            ┌──────────────┐
  │  UserStory   │                            │   Release    │
  └──────────────┘                            └──────────────┘
```

### Enums

```typescript
enum UserRole {
  ADMIN = 'ADMIN',
  PM = 'PM',
  DEVELOPER = 'DEVELOPER',
  TESTER = 'TESTER',
}

enum Priority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

enum StoryStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
}

enum ReleaseStatus {
  DRAFT = 'DRAFT',
  CLOSED = 'CLOSED',
}

enum TestStatus {
  UNTESTED = 'UNTESTED',
  IN_PROGRESS = 'IN_PROGRESS',
  PASS = 'PASS',
  FAIL = 'FAIL',
  PARTIALLY_TESTED = 'PARTIALLY_TESTED',
  CANT_BE_TESTED = 'CANT_BE_TESTED',
}

enum StepStatus {
  PASS = 'PASS',
  FAIL = 'FAIL',
  SKIPPED = 'SKIPPED',
}

enum BugSeverity {
  CRITICAL = 'CRITICAL',
  MAJOR = 'MAJOR',
  MINOR = 'MINOR',
  TRIVIAL = 'TRIVIAL',
}

enum BugStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
}

enum AutomationRunStatus {
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

enum AutomationTrigger {
  UI = 'UI',
  CI_CD = 'CI_CD',
  REGISTRY_SYNC = 'REGISTRY_SYNC',
}

enum LinkSource {
  USER = 'USER',
  AUTO_DISCOVERY = 'AUTO_DISCOVERY',
}
```

## 7. Security Architecture

### Auth Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Client  │────►│  JwtAuthGuard │────►│  RolesGuard  │────► Controller
│          │     │  (verify      │     │  (check role │
│  Bearer  │     │   token)      │     │   vs @Roles) │
│  header  │     └──────────────┘     └──────────────┘
└──────────┘           │ fail                │ fail
                       ▼                     ▼
                   401 Unauthorized      403 Forbidden
```

### Token Strategy
- **Access token**: Short-lived (15 minutes). Contains `{ userId, email }`. Sent in `Authorization: Bearer` header.
- **Refresh token**: Longer-lived (7 days). Stored securely client-side. Used only to get new token pairs.
- **Rotation**: Every refresh issues a new pair. Old refresh token is invalidated.
- **Logout**: Invalidate the refresh token server-side.

### WebSocket Auth
- Token sent on initial connection: `io("/test-runner", { auth: { token } })`
- Gateway middleware validates token before allowing connection.
- Invalid/expired token → connection rejected.

### Permission Model
All role checks happen server-side via `RolesGuard` + `@Roles()` decorator. The client hides UI elements based on role, but this is cosmetic — the server is the authority.

## 8. Error Handling Architecture

```
Exception thrown in Service
  │
  ▼
HttpExceptionFilter (global)
  │
  ├── Known NestJS exceptions (BadRequest, NotFound, etc.)
  │     └── Map to standard error shape: { statusCode, message, error }
  │
  ├── Validation errors (class-validator)
  │     └── Map to: { statusCode: 400, message: "Validation failed", errors: [...] }
  │
  └── Unknown errors
        └── Log full stack trace, return: { statusCode: 500, message: "Internal server error" }
```

### Domain-Specific Errors

| Scenario | Exception | Code |
|---|---|---|
| Invalid credentials | `UnauthorizedException` | 401 |
| Expired/invalid token | `UnauthorizedException` | 401 |
| Wrong role for action | `ForbiddenException` | 403 |
| Entity not found | `NotFoundException` | 404 |
| Release already closed | `ConflictException` | 409 |
| Close release with 0 stories | `BadRequestException` | 400 |
| Story already locked by another tester | `ConflictException` | 409 |
| DTO validation failure | `BadRequestException` | 400 |

## 9. WebSocket Architecture

### Connection Lifecycle

```
1. Client connects with token
2. Gateway middleware validates token → extract userId
3. Client emits join-session → server adds socket to room release:{releaseId}
4. Server tracks: { socketId → userId, releaseId, assignedStoryId, lastSeen }
5. Client sends heartbeat every 15s → server updates lastSeen
6. On disconnect or timeout → cleanup assigned story, notify room
```

### Server-Side State (In-Memory)

```typescript
// Managed by TestExecutionGateway
Map<socketId, {
  userId: string;
  releaseId: string;
  assignedExecutionId: string | null;
  lastSeen: Date;
}>
```

This map is ephemeral — it lives only in server memory. If the server restarts, all sessions are dropped and testers must reconnect. Persistent state (executions, results) lives in PostgreSQL.

### Story Assignment Algorithm

```
1. Receive request-work from tester
2. BEGIN TRANSACTION
3. SELECT release_story WHERE release_id = :releaseId
     AND id NOT IN (
       SELECT release_story_id FROM test_executions
       WHERE status IN ('IN_PROGRESS', 'PASS')
     )
     ORDER BY priority DESC, created_at ASC
     LIMIT 1
     FOR UPDATE SKIP LOCKED
4. INSERT test_execution (status = IN_PROGRESS, assigned_to = userId)
5. COMMIT
6. Emit story-assigned to tester
7. Emit status-changed + dashboard-update to room
```

`FOR UPDATE SKIP LOCKED` ensures no two testers get the same story, even under high concurrency.

## 10. Playwright Automation Architecture

### Test Registry & Linking Flow

```
External Project                Veriflow Server                  Database
  │                               │                               │
  ├── playwright test --list     │                               │
  │   (CI step or CLI tool)      │                               │
  │                               │                               │
  ├── POST /automation/           │                               │
  │   registry/sync ─────────────►│                               │
  │   { tests: [...] }           │── Upsert PlaywrightTest rows ─►│
  │                               │── Auto-link via storyIds ────►│
  │                               │   (linkedBy = AUTO_DISCOVERY) │
  │◄── { created, updated,      │                               │
  │      linked } ───────────────│                               │
```

### CI/CD Result Reporting Flow

```
CI/CD Pipeline               Veriflow Server                  Database
  │                               │                               │
  ├── Run Playwright tests       │                               │
  │                               │                               │
  ├── POST /automation/runs ─────►│                               │
  │   { triggeredBy: CI_CD,      │── Create AutomationRun rows ─►│
  │     releaseId: uuid,         │── Match externalId → testId   │
  │     results: [...] }         │── Compute conflict status     │
  │                               │                               │
  │◄── { recorded: N } ─────────│                               │
```

### Conflict Detection (Read-Time)

```
Client                          Server
  │                               │
  ├── GET /stories/:id/          │
  │   automation/summary ────────►│
  │                               │── Get linked tests for story
  │                               │── Get latest AutomationRun per test
  │                               │── Get latest manual TestExecution
  │                               │── Compare: manual vs automation
  │                               │── If disagree → conflict: true
  │◄── { conflict: true,        │
  │      manualStatus: PASS,     │
  │      automationStatus: FAIL }│
```

### Test Execution Trigger Flow (UI)

```
User (Browser)           Veriflow API              Bull Queue (Redis)         Test Worker
  │                        │                          │                          │
  ├── POST /automation/    │                          │                          │
  │   trigger ────────────►│                          │                          │
  │   { testIds,           │── Create AutomationRun   │                          │
  │     baseUrl,           │   (status: QUEUED)       │                          │
  │     releaseId? }       │                          │                          │
  │                        │── Enqueue job ──────────►│                          │
  │◄── 202 { batchId,    │                          │                          │
  │      runs: [...] }    │                          │                          │
  │                        │                          │── Dequeue job ──────────►│
  │                        │                          │                          │
  │   (poll GET            │                          │   ┌── CLONING ──────────┤
  │    /runs/:id/status)   │◄── Update status ────────│───┤   git clone repo    │
  │◄── { CLONING } ──────│                          │   │                      │
  │                        │                          │   ├── INSTALLING ───────┤
  │◄── { INSTALLING } ───│◄── Update status ────────│───┤   npm ci             │
  │                        │                          │   │                      │
  │◄── { RUNNING } ──────│◄── Update status ────────│───┤── RUNNING ──────────┤
  │                        │                          │   │   npx playwright    │
  │                        │                          │   │   test --reporter   │
  │                        │                          │   │   =json             │
  │                        │                          │   │                      │
  │◄── { PASS/FAIL,      │◄── Report results ───────│───┤── Parse JSON output │
  │      duration,         │── Update AutomationRun   │   │── Report to API     │
  │      logs } ──────────│── Compute conflicts       │   └── Cleanup workdir   │
```

### Tunnel Architecture (Local App Testing)

```
Developer Machine            Veriflow Tunnel Server          Test Worker
  │                            │                               │
  ├── veriflow tunnel          │                               │
  │   --port 3000              │                               │
  │   --project <id> ─────────►│                               │
  │   --token <jwt>            │── Validate token              │
  │                            │── Assign tunnel URL           │
  │◄── Tunnel active ─────────│   https://abc.tunnel.veriflow │
  │   (WSS connection held)    │                               │
  │                            │                               │
  │                            │◄── HTTP request (baseUrl) ────┤
  │◄── Forward request ───────│   via tunnel URL               │  Playwright
  │   localhost:3000           │                               │  navigates to
  │── Response ───────────────►│── Forward response ──────────►│  tunnel URL
  │                            │                               │
  │   ✕ CLI exits              │                               │
  │                            │── Invalidate tunnel URL       │
```

### Worker Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Test Worker Service                    │
│                  (Docker container)                       │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Bull Queue   │  │  Git Clone   │  │  Playwright    │ │
│  │ Consumer     │──│  + Cache     │──│  Runner        │ │
│  │              │  │              │  │  (JSON output) │ │
│  └──────────────┘  └──────────────┘  └───────┬────────┘ │
│                                               │          │
│                                    ┌──────────┴────────┐ │
│                                    │  Result Reporter  │ │
│                                    │  (POST to API)    │ │
│                                    └───────────────────┘ │
│                                                           │
│  Pre-installed: Node.js 20, Playwright, Chromium,        │
│                 Firefox, WebKit                           │
└─────────────────────────────────────────────────────────┘
```

**Worker container specs**:
- Base image: `mcr.microsoft.com/playwright:v1.x-noble`
- Node.js 20 pre-installed
- Git CLI for repo cloning
- Max concurrent jobs: configurable (default: 2)
- Job timeout: configurable (default: 10 minutes)
- Repo cache: project-keyed, invalidated on branch/commit change

### Infrastructure Dependencies

```
docker compose up --build
  │
  ├── db (postgres:16-alpine)
  │     Port 5432
  │
  ├── redis (redis:7-alpine)
  │     Port 6379 │ Used by Bull job queue
  │
  ├── server (veriflow API)
  │     Port 3001 │ Depends on: db, redis
  │     Bull producer (enqueues jobs)
  │     Tunnel server (WSS endpoint)
  │
  ├── worker (veriflow test worker)
  │     No exposed port │ Depends on: redis, server
  │     Bull consumer (processes jobs)
  │     Playwright + browsers pre-installed
  │
  └── client (Next.js)
        Port 3000 │ Depends on: server
```

### Key Design Decisions
- **Tests live externally** — Veriflow stores metadata only (file, name, tags), not test source code.
- **Registry is push-based** — external projects push their catalog; Veriflow doesn't pull/scan repos.
- **AutomationRun is append-only** — like TestExecution, every run is its own row.
- **Conflicts are computed, not stored** — no separate conflict entity; derived at query time from latest results.
- **Release-optional** — runs can target a specific release or be story-level only.
- **Dedicated worker service** — test execution is isolated in a separate container, not on the API server.
- **Git clone with caching** — worker clones repos on demand but caches for repeated runs against the same project.
- **Bull (Redis) job queue** — reliable async job dispatch from API to worker with status tracking.
- **Built-in tunnel** — WSS-based tunnel from developer's machine to test worker for local app testing.
- **Poll-based status** — UI polls `GET /runs/:id/status` for progress updates (QUEUED → CLONING → RUNNING → PASS/FAIL).
