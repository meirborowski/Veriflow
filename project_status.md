# Veriflow — Project Status

## Current Phase
**Phase 1 — Foundation**

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

#### Releases (end-to-end)
| Task | Status | Notes |
|---|---|---|
| Release CRUD (draft state) | Not Started | |
| Story-to-release scoping (add/remove) | Not Started | |
| Release close → snapshot creation | Not Started | Transaction: copy stories + steps |
| Client: release list + detail pages | Not Started | |
| Client: release scoping UI | Not Started | |

#### Release Dashboard (end-to-end)
| Task | Status | Notes |
|---|---|---|
| Release dashboard (read-only frozen scope) | Not Started | |
| Client: release dashboard | Not Started | |

### Phase 3 — Test Runner

#### Real-time Test Execution (end-to-end)
| Task | Status | Notes |
|---|---|---|
| WebSocket gateway setup | Not Started | Socket.io + NestJS Gateway |
| WebSocket auth middleware | Not Started | Token validation on connect |
| Real-time story assignment (lock/unlock) | Not Started | `FOR UPDATE SKIP LOCKED` |
| Step-by-step execution flow | Not Started | |
| Heartbeat + disconnect cleanup | Not Started | 15s interval, 2min timeout |
| Live dashboard updates | Not Started | Broadcast to room |
| Client: test runner page | Not Started | |
| Client: step checklist UI | Not Started | |
| Client: live progress sidebar | Not Started | |
| Client: real-time presence | Not Started | |

### Phase 4 — Defect Tracking

#### Bug Management (end-to-end)
| Task | Status | Notes |
|---|---|---|
| Bug entity + CRUD | Not Started | |
| Auto-create bug on Fail verdict | Not Started | |
| Bug lifecycle (Open → Resolved → Closed) | Not Started | |
| Client: bug list per project | Not Started | |
| Client: bug detail page | Not Started | |
| Client: bug creation from test runner | Not Started | |

### Phase 5 — Polish
| Task | Status | Notes |
|---|---|---|
| Pagination across all list endpoints | Not Started | |
| Filtering + search | Not Started | |
| In-app notifications | Not Started | |
| Reporting / export | Not Started | |
| File attachments (stories + bugs) | Not Started | |

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
