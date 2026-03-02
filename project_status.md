# Veriflow — Project Status

## Current Phase
**Phase 4 — Defect Tracking** (Complete)

## Phase Progress

### Phase 1 — Foundation

#### Infrastructure
| Task | Status | Notes |
|---|---|---|
| Project scaffolding (client + server) | Done | Next.js 16 + NestJS 11 |
| Documentation (spec, architecture, CLAUDE.md) | Done | |
| Docker Compose dev environment | Done | PostgreSQL + server + client with hot-reload |
| PostgreSQL + TypeORM setup | Done | TypeORM + ConfigModule + shared enums |
| Global validation pipe | Done | class-validator, whitelist + forbidNonWhitelisted |
| Global exception filter | Done | Standardized error shape, 500 catch-all |

#### Auth (end-to-end)
| Task | Status | Notes |
|---|---|---|
| User entity | Done | UUID PK, hashed password, hashed refresh token |
| Auth module (register, login, refresh, me) | Done | JWT access (15m) + refresh (7d) tokens |
| JWT strategy + guards | Done | Global JwtAuthGuard with @Public() bypass |
| Client: auth pages (login, register) | Done | Shadcn/UI forms, API client with token refresh |
| Client: protected route layout | Done | Sidebar nav, auth redirect, skeleton loading |

#### Projects (end-to-end)
| Task | Status | Notes |
|---|---|---|
| Project CRUD | Done | Create, list (paginated), get, update, delete |
| Roles guard + @Roles() decorator | Done | Per-project role check via ProjectMember lookup |
| Project member management (invite, role, remove) | Done | Add by email, update role, prevent last-admin removal |
| Client: project list + detail pages | Done | Table, create dialog, detail, settings, member mgmt |

#### User Stories (end-to-end)
| Task | Status | Notes |
|---|---|---|
| User Story CRUD + verification steps | Done | Entities, service, controller, DTOs, step sync, filters |
| RolesGuard adaptation for story routes | Done | @ResolveProjectFrom('story') + projectId param fallback |
| Client: story list + create/edit pages | Done | List with filters, create form, detail/edit with step builder |
| Unit tests (service, controller, guard) | Done | 29 new tests (102 total) |

### Phase 2 — Release Engine

#### Releases — Server (end-to-end)
| Task | Status | Notes |
|---|---|---|
| Release + snapshot entities | Done | Release, ReleaseStory, ReleaseStoryStep, scoping join table |
| RolesGuard extension for release routes | Done | @ResolveProjectFrom('release') |
| Release CRUD (draft state) | Done | Create, list (paginated), get, update, delete |
| Story-to-release scoping (add/remove) | Done | Bulk add by storyIds, remove individual, draft-only |
| Release close → snapshot creation | Done | Transaction: copy stories + steps, set CLOSED |
| Unit tests (service, controller, guard) | Done | 35 tests (service + controller + guard) |

#### Releases — Client (end-to-end)
| Task | Status | Notes |
|---|---|---|
| Release types + hooks | Done | TanStack Query, query key factory, 9 hooks |
| Client: release list page | Done | Table, filters, empty state, skeleton |
| Client: create release | Done | Dialog with redirect to detail |
| Client: release detail page | Done | Overview, story list, status badge, skeleton |
| Client: release scoping UI (draft) | Done | Add stories dialog with search, remove with confirm |
| Client: close release action | Done | Confirmation dialog, query invalidation |
| Client: release dashboard (closed) | Done | Summary card, expandable snapshot stories |
| Navigation integration | Done | Project detail link, ReleaseStatusBadge |

### Phase 3 — Test Runner

#### Real-time Test Execution — Server
| Task | Status | Notes |
|---|---|---|
| TestExecution + StepResult entities | Done | UUID PKs, enum columns, FK relations |
| WebSocket gateway setup | Done | Socket.io + NestJS Gateway, /test-runner namespace |
| WebSocket auth middleware | Done | JWT verification on handleConnection |
| Real-time story assignment (lock/unlock) | Done | FOR UPDATE SKIP LOCKED, priority ordering |
| Step-by-step execution flow | Done | Upsert StepResult per step |
| Final verdict submission | Done | PASS/FAIL/PARTIAL/CANT_TEST with completedAt |
| Heartbeat + disconnect cleanup | Done | 30s check, 2min timeout, hard-delete on disconnect |
| Startup orphan cleanup | Done | Delete stale IN_PROGRESS on module init |
| REST endpoints (history, latest, detail) | Done | Paginated, with filters |
| RolesGuard execution resolution | Done | @ResolveProjectFrom('execution') |
| DTOs + validation | Done | 6 DTO files with class-validator |
| Unit tests | Done | 38 tests (service + gateway + controller) |

#### Real-time Test Execution — Client
| Task | Status | Notes |
|---|---|---|
| Socket.io-client + SocketProvider | Done | JWT auth, heartbeat (15s), event subscriptions |
| useTestRunner orchestration hook | Done | State machine: idle → executing → pool-empty |
| TanStack Query hooks | Done | useExecutions, useLatestExecutions, useExecution |
| Types | Done | TestStatus, StepStatus, BugSeverity, WS payloads, REST types |
| TestStatusBadge component | Done | Per-status colors matching CLAUDE.md style guide |
| Test runner page | Done | Breadcrumbs, CLOSED guard, SocketProvider wrapper |
| Step checklist UI | Done | Pass/Fail/Skip toggles, comment support |
| Submission panel | Done | Verdict selector, bug report form (on Fail) |
| Live progress sidebar | Done | Progress bar, summary counts, per-story status |
| Real-time presence | Done | ActiveTesters with online count |
| Navigation integration | Done | "Open Test Runner" button on closed release |

### Phase 4 — Defect Tracking

#### Bug Management — Server
| Task | Status | Notes |
|---|---|---|
| Bug entity | Done | UUID PK, FK to Project, UserStory, TestExecution, User (reporter/assignee) |
| RolesGuard + decorator extension | Done | @ResolveProjectFrom('bug'), bug ID → projectId resolution |
| Bug CRUD service | Done | create, createFromExecution, findAllByProject, findOne, update, remove |
| Bug controller + DTOs | Done | POST/GET/PATCH/DELETE, create-bug, update-bug, bug-query DTOs |
| Auto-create bug on FAIL verdict | Done | TestExecutionService.submitResult → BugsService.createFromExecution |
| Bug entity in dependent modules | Done | Registered in Projects, UserStories, Releases, TestExecution modules |
| Unit tests | Done | 25 new tests (bugs service + controller + guard + auto-creation) |

#### Bug Management — Client
| Task | Status | Notes |
|---|---|---|
| Bug types | Done | BugListItem, BugDetail, BugStatus, payloads, PaginatedBugs |
| TanStack Query hooks | Done | useBugs, useBug, useCreateBug, useUpdateBug, useDeleteBug |
| BugSeverityBadge | Done | Critical=rose, Major=orange, Minor=amber, Trivial=slate |
| BugStatusBadge | Done | Open=red, In Progress=blue, Resolved=green, Closed=slate, Reopened=amber |
| Bug list page | Done | Table, severity/status filters, pagination, empty state, skeleton loading |
| Bug detail page | Done | Status/severity/assignee dropdowns, metadata, description, delete |
| Sidebar navigation | Done | "Bugs" nav item with Bug icon |
| Test runner integration | Done | Invalidate bug queries after result submission |

### Phase 5 — Polish
| Task | Status | Notes |
|---|---|---|
| Pagination across all list endpoints | Not Started | |
| Filtering + search | Not Started | |
| In-app notifications | Not Started | |
| Reporting / export | Not Started | |
| File attachments (stories + bugs) | Not Started | |

### Phase 6 — Playwright Automation Integration

#### Automation — Server
| Task | Status | Notes |
|---|---|---|
| PlaywrightTest entity | Not Started | UUID PK, FK to Project, externalId unique per project |
| StoryTestLink entity (N:N join) | Not Started | FK to UserStory + PlaywrightTest, linkedBy enum (USER/AUTO_DISCOVERY) |
| AutomationRun entity | Not Started | Append-only run log, FK to PlaywrightTest + optional Release |
| ProjectRepoConfig entity | Not Started | Git repo URL, branch, test dir, encrypted auth token per project |
| New enums: AutomationRunStatus, AutomationTrigger, LinkSource | Not Started | |
| Automation module (service, controller, DTOs) | Not Started | |
| Registry sync endpoint (POST /projects/:id/automation/registry/sync) | Not Started | External projects push test catalog |
| Test CRUD endpoints (list, get, delete) | Not Started | |
| Story-test linking endpoints (link, unlink) | Not Started | |
| Automation trigger endpoint (POST /projects/:id/automation/trigger) | Not Started | Dispatches jobs to test worker via Bull queue |
| Automation run reporting endpoint (POST /projects/:id/automation/runs) | Not Started | CI/CD pushes results |
| Automation run query endpoints (list, get, status) | Not Started | Includes poll-based status endpoint |
| Story automation summary endpoint (GET /stories/:id/automation/summary) | Not Started | Conflict detection logic |
| Tunnel registration endpoint (POST /projects/:id/automation/tunnel) | Not Started | Register/teardown tunnel sessions |
| RolesGuard extension for automation routes | Not Started | @ResolveProjectFrom('test'), @ResolveProjectFrom('run') |
| Unit tests | Not Started | |

#### Automation — Test Worker Service
| Task | Status | Notes |
|---|---|---|
| Worker service scaffolding | Not Started | Separate NestJS app or standalone Node.js service |
| Docker container with Playwright + browsers | Not Started | Pre-built image with Node.js + Playwright browsers |
| Bull queue consumer (job processing) | Not Started | Listen for jobs from API, execute tests |
| Git clone + caching logic | Not Started | Clone repo, cache for repeated runs, pull updates |
| Dependency installation (`npm ci`) | Not Started | Isolated per-run working directory |
| Playwright test execution | Not Started | Run with JSON reporter, configurable baseUrl |
| Result parser (JSON → AutomationRun) | Not Started | Parse Playwright JSON output into run results |
| Result reporter (Worker → API) | Not Started | POST results back to Veriflow API |
| Run timeout + cancellation | Not Started | Kill process after configurable max duration |
| Concurrency management | Not Started | Limit simultaneous runs per worker instance |
| Docker Compose integration | Not Started | Add worker service to docker-compose.yml |
| Redis service for Bull queue | Not Started | Add Redis to docker-compose.yml |

#### Automation — Veriflow CLI (Tunnel)
| Task | Status | Notes |
|---|---|---|
| CLI package scaffolding (@veriflow/cli) | Not Started | npm package with bin entry point |
| Tunnel command (`veriflow tunnel`) | Not Started | --port, --project, --token flags |
| WebSocket tunnel client | Not Started | Connect to Veriflow tunnel server, forward HTTP traffic |
| Tunnel server (in Veriflow API or separate) | Not Started | Accept tunnel WebSocket connections, assign URLs, route traffic |
| Tunnel URL management | Not Started | UUID-based URLs, expiration, cleanup |
| Authentication (CLI → API) | Not Started | Validate API token on tunnel registration |

#### Automation — Client
| Task | Status | Notes |
|---|---|---|
| Automation types | Not Started | PlaywrightTest, StoryTestLink, AutomationRun, enums |
| TanStack Query hooks | Not Started | useAutomationTests, useAutomationRuns, useStoryAutomation, mutations |
| AutomationStatusBadge component | Not Started | Pass=green, Fail=red, Error=orange, Skipped=gray |
| ConflictIndicator component | Not Started | Warning badge when manual vs automation disagree |
| Story detail: automation panel | Not Started | Summary card, linked tests list, recent runs, conflict flag |
| Automation tests list page | Not Started | Table with filters, link status, last run |
| Automation test detail page | Not Started | Linked stories, run history, logs drill-down |
| Automation runs list page | Not Started | Filterable by test, release, status |
| Automation run detail page | Not Started | Full output: logs, error, duration, linked stories |
| Run trigger UI | Not Started | "Run Tests" button, test selection, baseUrl input, live status polling |
| Release dashboard: automation column | Not Started | Per-story automation status + conflict indicator |
| Link test dialog (on story page) | Not Started | Search/select from test registry |
| Project settings: repo config | Not Started | Form to configure git repo URL, branch, test dir, auth token |
| Tunnel status indicator | Not Started | Show active tunnels in project context |
| Sidebar navigation | Not Started | "Automation" nav item |

## Blockers
None currently.

## Decisions Log
| Date | Decision | Context |
|---|---|---|
| 2026-02-15 | TypeORM over Prisma | User preference |
| 2026-02-15 | Discard partial work on disconnect | Simplifies state management — no recovery needed |
| 2026-02-15 | Full execution history (append-only) | Every test attempt is its own row for audit trail |
| 2026-02-15 | Bug entity created on Fail | Separate lifecycle, linked to story + execution |
| 2026-02-15 | Docker Compose for dev | All services (db, server, client) run via `docker compose up` with hot-reload |
| 2026-02-19 | Separate scoping join table for draft releases | Many-to-many `release_scoped_stories` tracks draft scope; ReleaseStory snapshots created only on close |
| 2026-03-02 | N:N Playwright test linking | Stories and Playwright tests have many-to-many relationship via StoryTestLink join table |
| 2026-03-02 | Registry API for test discovery | External projects push their Playwright test catalog to Veriflow via sync endpoint |
| 2026-03-02 | Dual linking: manual + auto-discovery | Tests can be linked manually in UI or auto-discovered from annotations in test results |
| 2026-03-02 | Conflict detection over override | When manual and automated results disagree, flag a conflict — don't auto-override either result |
| 2026-03-02 | Release-optional automation runs | Automation runs can optionally target a release; otherwise tracked at story level only |
| 2026-03-02 | Dedicated test worker service | Playwright execution runs in a separate microservice, not on the main API server — isolation + scalability |
| 2026-03-02 | Git clone for test source | Worker clones the project's git repo to get Playwright test files — keeps tests in their native repo |
| 2026-03-02 | Built-in tunnel for local apps | Veriflow CLI creates a secure WebSocket tunnel so the test worker can reach localhost apps |
| 2026-03-02 | Bull (Redis) job queue | API dispatches test execution jobs to workers via Bull queue — reliable, supports concurrency limits |
