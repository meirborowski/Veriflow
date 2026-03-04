# Changelog

## 2026-03-04 (6c)

- feat: add Phase 6c — Client Automation UI
- feat: add automation types (PlaywrightTest, AutomationRun, ProjectRepoConfig, AutomationSummary, enums)
- feat: add use-automation.ts with all TanStack Query hooks (useTests, useTest, useDeleteTest, useLinkTests, useUnlinkTest, useAutomationSummary, useTriggerRun, useRuns, useRun, useRunStatus with 2s polling, useRepoConfig, useUpsertRepoConfig)
- feat: add AutomationRunStatusBadge with per-status colors (QUEUED/CLONING/INSTALLING/RUNNING/PASS/FAIL/ERROR/TIMEOUT/CANCELLED)
- feat: add ConflictIndicator warning badge
- feat: add LinkTestDialog — search+select tests from registry to link to a story
- feat: add /projects/:id/automation page — test registry table with search, delete, Run Tests button
- feat: add TriggerRunDialog — select tests + baseUrl → trigger run + live status polling per runId
- feat: add /projects/:id/automation/:testId page — test detail with linked stories + recent runs table
- feat: add /projects/:id/automation/runs page — filterable runs list
- feat: add /projects/:id/automation/runs/:runId page — run detail with status, duration, logs, error
- feat: add RepoConfigForm to project settings — repoUrl, branch, testDirectory, playwrightConfig, authToken
- feat: add Automation nav item (Bot icon) to project sidebar
- feat: add collapsible Automation section to story detail page — linked tests, run statuses, ConflictIndicator, Link/Unlink
- feat: add Auto Status column to release snapshot stories table
- feat: add api.put() method to API client

## 2026-03-04

- feat: add Phase 6b — Test Worker Service (standalone NestJS app in worker/)
- feat: add GitService with SHA-256-based repo cache (/tmp/veriflow-repos/), clone --depth 1 on miss, git pull on hit, PAT token injection into HTTPS URL
- feat: add RunnerService executing `npx playwright test --reporter=json`, parsing JSON output to PASS/FAIL/ERROR, with configurable timeout
- feat: add ReporterService PATCHing run status/results to Veriflow API with x-worker-api-key header; swallows reporting errors to avoid masking test results
- feat: add WorkerProcessor (@Processor('automation')) implementing full state machine: CLONING → INSTALLING → RUNNING → PASS/FAIL/ERROR/TIMEOUT; catches all errors and reports them
- feat: add WorkerModule, AppModule, main.ts (no HTTP listen — pure Bull consumer)
- feat: add worker/Dockerfile using mcr.microsoft.com/playwright:v1.49-noble base image
- feat: add worker service to docker-compose.yml (depends on redis + server, workerrepos volume)
- feat: add VERIFLOW_API_URL, WORKER_CONCURRENCY, MAX_RUN_DURATION_MS to .env.example
- test: add 24 unit tests for GitService, RunnerService, ReporterService, WorkerProcessor (all state machine paths including timeout and error)

## 2026-03-03

- feat: add Phase 6a — Playwright Automation Integration (server module)
- feat: add AutomationRunStatus, AutomationTrigger, LinkSource enums
- feat: add PlaywrightTest entity (playwright_tests table, UNIQUE projectId+externalId, tags text[])
- feat: add StoryTestLink entity (story_test_links table, UNIQUE storyId+testId)
- feat: add AutomationRun entity (automation_runs table, indexed by projectId+testId and projectId+status)
- feat: add ProjectRepoConfig entity (project_repo_configs table, UNIQUE projectId, encrypted authToken)
- feat: add AES-256-GCM crypto utility (encrypt/decrypt) for PAT token storage
- feat: add AutomationService with registrySync, listTests, getTest, deleteTest, linkTests, unlinkTest, getAutomationSummary, triggerRun, reportRun, listRuns, getRun, getRunStatus, updateRunStatus, getRepoConfig, upsertRepoConfig
- feat: add AutomationController with 15 REST endpoints under /api/v1
- feat: add WorkerAuthGuard (x-worker-api-key header) for worker PATCH /automation/runs/:id/status
- feat: add AutomationModule with BullModule (Redis-backed queue named 'automation')
- feat: add @ResolveProjectFrom('automation-test') and @ResolveProjectFrom('automation-run') to RolesGuard
- feat: add Redis service to docker-compose.yml (redis:7-alpine, port 5379:6379, health check)
- feat: add REDIS_HOST, REDIS_PORT, ENCRYPTION_KEY, WORKER_API_KEY to .env.example
- test: add 58 unit tests for AutomationService, AutomationController, crypto utility, RolesGuard extensions
- test: add E2E tests for all automation endpoints (registry sync, link/unlink, summary, trigger, runs, repo config, role enforcement)

## 2026-03-02

- feat: add file attachments module with MinIO S3-compatible object storage
- feat: add Attachment entity (UUID PK, originalName, mimeType, size, storageKey, entityType, entityId)
- feat: add StorageService wrapping @aws-sdk/client-s3 with upload, delete, getSignedDownloadUrl, auto-bucket creation
- feat: add AttachmentsService with upload validation (10 MB max, MIME allowlist), CRUD, and project resolution
- feat: add AttachmentsController with role-guarded endpoints (POST/GET entity/:type/:id, GET :id/download, DELETE :id)
- feat: add @ResolveProjectFrom('attachment') for attachment-scoped role checking via entity traversal
- feat: add @ResolveProjectFrom('attachment-entity') for entity-scoped role checking via entityType/entityId params
- feat: add MinIO service to docker-compose.yml with health check and persistent volume
- feat: add client AttachmentList component with upload button, file list, download/delete actions
- feat: add useAttachments, useUploadAttachment, useDeleteAttachment, useDownloadAttachment hooks
- feat: add attachments section to story detail and bug detail pages
- test: add 22 unit tests for StorageService, AttachmentsService, AttachmentsController
- test: add 6 unit tests for RolesGuard attachment and attachment-entity resolution
- test: add 18 E2E tests for attachment endpoints (upload, list, download, delete, validation, role enforcement)
- feat: add CSV and PDF export module for release reports and bug lists
- feat: add streaming CSV generation via fast-csv with release story/step/execution data
- feat: add PDF generation via pdfkit with formatted release reports and bug reports
- feat: add export controller with role-guarded endpoints (GET releases/:id/export, GET projects/:projectId/bugs/export)
- feat: add client ExportButton dropdown component with CSV/PDF options
- feat: add useExportRelease and useExportBugs hooks with authenticated blob download
- feat: add export button to closed release detail page and bugs list page
- test: add 11 unit tests for ExportService (CSV/PDF generation, filters, edge cases)
- test: add 6 unit tests for ExportController (format routing, validation)
- test: add E2E tests for export endpoints (auth, format validation, CSV/PDF content, role enforcement)
- feat: add in-app notifications module (entity, service, controller, gateway) with WebSocket real-time delivery
- feat: add NotificationType enum (BUG_ASSIGNED, BUG_STATUS_CHANGED, RELEASE_CLOSED, MEMBER_ADDED)
- feat: trigger notifications on bug assignment, bug status change, release close, and member addition
- feat: add notification bell component with unread count badge, dropdown panel, and mark-as-read actions
- feat: add NotificationSocketProvider for real-time notification delivery via Socket.io
- test: add unit tests for notifications service, controller, and gateway
- test: add E2E tests for notification endpoints and trigger scenarios
- docs: add Phase 6 — Playwright Automation Integration plan to project_spec, project_status, architecture, and CLAUDE.md
- docs: add test execution architecture — worker service, Bull job queue, tunnel CLI, trigger/status endpoints
- feat: add ILIKE search to bugs (title/description), releases (name), and projects (name) list endpoints
- feat: add dynamic sort (orderBy + sortDir) with allowlisted columns to all list endpoints
- feat: create ProjectQueryDto and refactor projects.findAllForUser to QueryBuilder
- feat: add useUrlFilters hook for URL-persisted filter/sort/pagination state via searchParams
- feat: add SortableHeader component with ASC/DESC/clear toggle and aria-sort accessibility
- feat: update all list pages (projects, stories, releases, bugs) with search inputs, sortable headers, and URL-persisted filters
- test: add unit tests for search and sort in bugs, releases, user-stories, and projects service specs

## 2026-03-01

- test: add E2E test infrastructure (global-setup/teardown, db/app/auth/seed helpers, jest-e2e/integration configs)
- test: add auth E2E tests (16 tests — register, login, refresh, me, throttle)
- test: add projects E2E tests (22 tests — CRUD, members, roles, access control)
- test: add user-stories E2E tests (14 tests — CRUD with steps, filters, role enforcement)
- test: add releases E2E tests (20 tests — CRUD, scoped stories, close/snapshot, immutability)
- test: add test-execution E2E tests (6 tests — list, latest, detail with step results)
- test: add bugs E2E tests (13 tests — CRUD, filters, role enforcement, cross-project validation)
- test: add WebSocket E2E tests (9 tests — auth, join-session, request-work, submit-result, disconnect cleanup)
- test: add releases integration tests (4 tests — snapshot immutability/completeness, concurrent double-close, empty close)
- test: add test-execution integration tests (5 tests — priority ordering, no double-booking, pool exclusions, cleanup, attempt counting)
- test: add projects integration tests (2 tests — cascade delete, last admin protection)
- test: add bugs integration tests (3 tests — createFromExecution chain, deleted source story, assign non-member)
- chore: add test:integration npm script, update test:e2e with --forceExit
- chore: install socket.io-client as devDependency for WebSocket E2E tests
- docs: update CLAUDE.md Testing section and Commands table with E2E/integration test docs
- feat: add Bug entity with relations to Project, UserStory, TestExecution, User (reporter/assignee)
- feat: add BugSeverity/BugStatus enums (already defined in Phase 3) used by Bug entity
- feat: extend RolesGuard with 'bug' resolution branch for bug-scoped role checking
- feat: extend ResolveProjectFrom decorator to accept 'bug' source type
- feat: add BugsModule with CRUD service, controller, and DTOs (create, update, query)
- feat: add BugsService with create, createFromExecution, findAllByProject, findOne, update, remove
- feat: add BugsController with POST/GET/PATCH/DELETE endpoints under /projects/:projectId/bugs and /bugs/:id
- feat: add auto-create bug on FAIL verdict in TestExecutionService.submitResult()
- feat: register Bug entity in ProjectsModule, UserStoriesModule, ReleasesModule, TestExecutionModule for RolesGuard DI
- feat: add client Bug types (BugListItem, BugDetail, BugStatus enum, payloads)
- feat: add TanStack Query hooks for bugs (useBugs, useBug, useCreateBug, useUpdateBug, useDeleteBug)
- feat: add BugSeverityBadge component (Critical=rose, Major=orange, Minor=amber, Trivial=slate)
- feat: add BugStatusBadge component (Open=red, In Progress=blue, Resolved=green, Closed=slate, Reopened=amber)
- feat: add Bugs nav item to project sidebar with Bug icon
- feat: add bug list page with severity/status filters, pagination, table with actions, empty state
- feat: add bug detail page with status/severity/assignee dropdowns, metadata, description, delete action
- feat: invalidate bug queries in test runner after result submission
- test: add 14 unit tests for BugsService (create, createFromExecution, list, detail, update, remove)
- test: add 5 unit tests for BugsController (create, findAll, findOne, update, remove)
- test: add 3 unit tests for RolesGuard bug resolution (resolve, not found, missing ID)
- test: add 3 unit tests for auto-bug-creation in TestExecutionService (FAIL+bug, PASS+bug, FAIL-no-bug)

## 2026-02-26

- feat: add TestExecution and StepResult entities with TypeORM relations (test_executions, step_results tables)
- feat: add WebSocket gateway (/test-runner namespace) with JWT auth, heartbeat, disconnect cleanup
- feat: add real-time story assignment with FOR UPDATE SKIP LOCKED to prevent double-booking
- feat: add step-by-step execution flow (update-step upserts StepResult per verification step)
- feat: add final verdict submission (PASS/FAIL/PARTIAL/CANT_TEST) with completedAt timestamp
- feat: add tester cleanup on disconnect (hard-delete IN_PROGRESS execution, unlock story)
- feat: add heartbeat checker (30s interval, 2min timeout) with automatic disconnect
- feat: add startup orphan cleanup (delete stale IN_PROGRESS executions older than 2min)
- feat: add REST endpoints for execution history (paginated), latest per-story, and execution detail
- feat: add @ResolveProjectFrom('execution') for execution-scoped role checking in RolesGuard
- feat: add DTOs for join-session, request-work, update-step, submit-result, heartbeat, execution-query
- feat: add TestExecutionModule with TypeORM, JwtModule, gateway, service, controller
- feat: install @nestjs/websockets, @nestjs/platform-socket.io, socket.io on server
- feat: add client SocketProvider context with JWT auth, heartbeat (15s), emit methods, event subscriptions
- feat: add useTestRunner orchestration hook (state machine: idle → executing → pool-empty)
- feat: add TanStack Query hooks for execution REST endpoints (useExecutions, useLatestExecutions, useExecution)
- feat: add test-execution TypeScript types (TestStatus, StepStatus, BugSeverity, WS payloads, REST responses)
- feat: add TestStatusBadge shared component (Untested=gray, In Progress=blue, Pass=green, Fail=red, Partial=amber, Can't Test=muted)
- feat: add test runner page with SocketProvider wrapper, release CLOSED guard, breadcrumbs
- feat: add TestRunnerContent with three states (idle/executing/pool-empty), connection indicator
- feat: add StepChecklist with vertical step layout, Pass/Fail/Skip toggles, optional comments
- feat: add SubmissionPanel with verdict selector, comment field, bug report form on Fail
- feat: add ProgressSidebar with progress bar, summary counts, per-story status list
- feat: add ActiveTesters presence indicator
- feat: add "Open Test Runner" button on closed release detail page
- feat: install socket.io-client on client
- test: add 25 unit tests for TestExecutionService (assign, update-step, submit, cleanup, queries)
- test: add 10 unit tests for TestExecutionGateway (auth, join, request-work, submit, heartbeat)
- test: add 3 unit tests for TestExecutionController
- fix: register TestExecution entity in ProjectsModule, UserStoriesModule, ReleasesModule for RolesGuard DI
- fix: use pessimistic_partial_write (FOR UPDATE SKIP LOCKED) instead of pessimistic_write_or_fail for non-blocking concurrent assignment
- fix: add project membership verification in gateway join-session handler
- fix: correct story pool filter to exclude IN_PROGRESS/PASS/CANT_BE_TESTED (FAIL/PARTIALLY_TESTED re-enter pool)
- fix: remove extra argument in heartbeat gateway test

## 2026-02-25

- feat: redesign dashboard sidebar with project-scoped navigation (Overview, Stories, Releases, Settings)
- feat: add route-aware sidebar that switches between global and project-scoped nav based on URL
- feat: polish auth pages with slate-50 background, card shadow, branded icon mark, and error alert icons
- feat: update breadcrumbs to use ChevronRight separator with truncation support
- feat: add colored dot indicators to StatusBadge, PriorityBadge, and ReleaseStatusBadge for accessibility
- feat: align badge colors to guideline semantic palette (rose/orange/amber heat scale for priority, slate/blue/emerald for status)
- feat: redesign RoleBadge with per-role color coding (purple Admin, blue PM, slate Developer, emerald Tester)
- feat: add tabular-nums to all numeric and date cells across tables and summary metrics
- feat: add max-width constraints to all page layouts for readability on wide screens
- feat: add ChevronRight affordance icons on project overview navigation cards
- feat: add connecting left border to verification steps timeline on story detail page
- feat: wrap step builder in subtle bg-slate-50 container for visual grouping
- feat: right-align submit button on project details settings form
- feat: add tabular-nums to pagination page counter
- docs: add ui-ux-guideline.md with modern, tool-focused design principles and reference it in CLAUDE.md

## 2026-02-19

- feat: add release types and TanStack Query hooks (list, detail, create, update, delete, close, add/remove stories)
- feat: add release list page with status filter, pagination, empty state, and skeleton loading
- feat: add create release dialog with redirect to detail page on success
- feat: add release detail page with draft/closed state views
- feat: add scoping UI: add stories dialog with multi-select search, remove story with confirmation
- feat: add close release confirmation dialog (disabled when 0 stories)
- feat: add closed release dashboard with summary card (total stories, total steps, priority breakdown)
- feat: add snapshot stories table with expandable verification steps
- feat: add ReleaseStatusBadge shared component (Draft = blue, Closed = green)
- feat: add "Releases" navigation link on project detail page
- chore: install shadcn checkbox component
- feat: add Release, ReleaseStory, ReleaseStoryStep entities with TypeORM relations
- feat: add release_scoped_stories many-to-many join table for draft scope tracking
- feat: extend RolesGuard with @ResolveProjectFrom('release') for release-scoped routes
- feat: add releases service with CRUD, pagination, storyCount CASE subquery
- feat: add story-to-release scoping (addStories, removeStory) with validation
- feat: add release close with transactional snapshot freeze (copies stories + steps)
- feat: add releases controller with 8 endpoints (create, list, get, update, delete, close, add stories, remove story)
- feat: add DTOs for release create/update, query, and add-stories
- feat: add releases module registered in AppModule
- test: add 27 unit tests for ReleasesService (CRUD, scoping, close/snapshot)
- test: add 8 unit tests for ReleasesController
- test: add 3 unit tests for RolesGuard release resolution

## 2026-02-18

- feat: add User Story and VerificationStep entities with TypeORM relations
- feat: add user stories service with CRUD, step sync algorithm, pagination, and filtering
- feat: add user stories controller with project-scoped and story-scoped routes
- feat: add DTOs for story create/update, step create/update, and story query with filters
- feat: add @ResolveProjectFrom('story') decorator for story-based project resolution in RolesGuard
- feat: adapt RolesGuard to support params.projectId fallback and story-based project lookup
- feat: add client types, TanStack Query hooks for story CRUD (list, detail, create, update, delete)
- feat: add stories list page with status/priority filters, search, pagination, and empty state
- feat: add create story page with step builder component
- feat: add story detail page with edit mode and step builder
- feat: add PriorityBadge and StatusBadge shared components
- feat: add "User Stories" navigation link on project detail page
- test: add 20 unit tests for UserStoriesService (CRUD, step sync, filters)
- test: add 5 unit tests for UserStoriesController
- test: add 4 unit tests for RolesGuard (projectId fallback, story resolution)

- feat: add projects list page with table, pagination, and empty state
- feat: add create project dialog with name and description form
- feat: add project detail page with breadcrumbs and members table
- feat: add project settings page (edit details, invite members, change roles, remove members, delete project)
- feat: add skeleton loading states for all project views
- feat: add TanStack Query hooks for all project CRUD and member management endpoints
- feat: add shared components (breadcrumbs, role badge, pagination)
- feat: add project TypeScript types matching backend API shapes
- chore: install shadcn components (dialog, table, dropdown-menu, badge, select, skeleton, textarea, separator, alert-dialog)

## 2026-02-17

- fix: prevent demoting last admin via updateMemberRole (was allowing project to lose all admins)
- fix: add refresh promise lock to prevent concurrent 401s from triggering multiple token refreshes
- feat: add @MaxLength(2000) to description field in CreateProjectDto and UpdateProjectDto
- feat: add @Index() on projectId in ProjectMember entity for efficient lookups
- test: add 2 unit tests for last-admin demotion guard in updateMemberRole (23 total)

## 2026-02-16 (Auth Client)

- feat: add API client with token refresh and 401 retry logic
- feat: add AuthProvider context with login, register, logout, and session restore
- feat: add TanStack Query provider for server state management
- feat: add login page with email/password form and error display
- feat: add register page with name/email/password form and validation hints
- feat: add dashboard layout with sidebar navigation and user info
- feat: add auth layout with centered card and redirect for authenticated users
- feat: add projects placeholder page with empty state
- feat: add root redirect to /projects
- chore: install Shadcn/UI (button, input, label, card, sonner), lucide-react, @tanstack/react-query

## 2026-02-16 (Projects Backend)

- feat: add Project entity with UUID PK, name, description, timestamps
- feat: add ProjectMember entity with composite PK (userId + projectId), role, join date
- feat: add @Roles() decorator and RolesGuard for per-project role-based access control
- feat: add projects service with 8 methods (CRUD + member management)
- feat: add projects controller with 8 endpoints under /projects
- feat: add DTOs for project create/update, member add/update, and pagination
- feat: add PaginationQueryDto with class-transformer for query parsing
- test: add 8 unit tests for RolesGuard
- test: add 20 unit tests for ProjectsService
- test: add 8 unit tests for ProjectsController

## 2026-02-15 (Auth)

- feat: add User entity with UUID PK, hashed password, hashed refresh token
- feat: add auth module (register, login, refresh, me) with JWT access + refresh tokens
- feat: add JWT strategy (passport-jwt) with Bearer token extraction
- feat: add JwtAuthGuard as global APP_GUARD with @Public() bypass
- feat: add @CurrentUser() param decorator for extracting authenticated user
- feat: add rate limiting on auth endpoints via @nestjs/throttler
- feat: enable CORS with CLIENT_URL origin
- test: add 19 unit tests for auth service, controller, strategy, guard, decorators

## 2026-02-15 (Infrastructure)

- feat: add PostgreSQL + TypeORM connection with ConfigModule
- feat: add global ValidationPipe with whitelist, forbidNonWhitelisted, field-level errors
- feat: add global HttpExceptionFilter with standardized error shape
- feat: add shared enums (UserRole, Priority, StoryStatus, ReleaseStatus, TestStatus, StepStatus, BugSeverity, BugStatus)
- feat: add pagination types (PaginatedResponse, PaginationMeta)
- feat: set global API prefix `/api/v1` (excluding `/health`)
- test: add 11 unit tests for ValidationPipe and HttpExceptionFilter

## 2026-02-15

- chore: clean up template scaffolding from Next.js and NestJS
- chore: add Docker Compose dev environment (PostgreSQL, server, client with hot-reload)
- chore: add Dockerfile.dev for server and client
- chore: add .env.example with all required environment variables
- chore: add .dockerignore
- fix: change server default port from 3000 to 3001 to match architecture spec
- docs: add Docker dev environment section to architecture.md, README.md, CLAUDE.md
- docs: update project_status.md with Docker Compose task completion
- docs: create project_spec.md with full specification (vision, data model, API design, WebSocket events, logging, dev phases)
- docs: create architecture.md (system diagram, layer responsibilities, data flows, DB schema, security, error handling, WebSocket internals)
- docs: rewrite CLAUDE.md with structured format (goals, milestone, architecture, design guide, constraints, repo etiquette, commands, testing, docs)
- docs: add UI/UX design & style guide to CLAUDE.md (visual identity, status colors, layout principles, component patterns, test runner UI)
- docs: add security, data integrity, and code rules to CLAUDE.md constraints & policies
- docs: add git workflow, branching strategy, and commit conventions to CLAUDE.md
- docs: add changelog rule to CLAUDE.md
- docs: create project_status.md with phase progress, task tracking, blockers, and decisions log
