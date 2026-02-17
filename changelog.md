# Changelog

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
