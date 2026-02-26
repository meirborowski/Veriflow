# Changelog

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
