# Phase 1 — Foundation (Detailed Plan)

## Overview
Auth (JWT), Project CRUD, User Story CRUD, Role-based access control — built end-to-end (server + client per feature).

---

## 1. Infrastructure

### 1.1 PostgreSQL + TypeORM setup
| # | Task | Status |
|---|---|---|
| 1 | Install TypeORM, `@nestjs/typeorm`, `@nestjs/config`, `pg` driver | Done |
| 2 | Configure `TypeOrmModule.forRootAsync()` + `ConfigModule` in `AppModule` | Done |
| 3 | Define shared enums (`UserRole`, `Priority`, `StoryStatus`, etc.) in `common/types/enums.ts` | Done |
| 4 | Define pagination types in `common/types/pagination.ts` | Done |

### 1.2 Global validation pipe
| # | Task | Status |
|---|---|---|
| 1 | Install `class-validator` and `class-transformer` | Done |
| 2 | Create `ValidationPipe` in `common/pipes/validation.pipe.ts` | Done |
| 3 | Register as global pipe in `main.ts` (`app.useGlobalPipes(...)`) | Done |
| 4 | Unit tests (6 tests): valid DTO, invalid DTO, field errors, non-whitelisted rejection, primitives, no metatype | Done |

### 1.3 Global exception filter
| # | Task | Status |
|---|---|---|
| 1 | Create `HttpExceptionFilter` in `common/filters/http-exception.filter.ts` | Done |
| 2 | Standardize error shape: `{ statusCode, message, error }` | Done |
| 3 | Handle validation errors: `{ statusCode: 400, message, errors: [{ field, message }] }` | Done |
| 4 | Catch unknown errors → log stack, return 500 generic message | Done |
| 5 | Register as global filter in `main.ts` | Done |
| 6 | Unit tests (5 tests): object response, string response, 404, unknown Error, non-Error | Done |

---

## 2. Auth (end-to-end)

### 2.1 User entity
| # | Task | Status |
|---|---|---|
| 1 | Create `auth/entities/user.entity.ts` — UUID PK, `email` (unique), `name`, `password` (hashed), `createdAt` | Not Started |
| 2 | Install `bcrypt` + `@types/bcrypt` | Not Started |
| 3 | Add `@BeforeInsert` hook to hash password | Not Started |
| 4 | Register entity in `AuthModule` / `TypeOrmModule.forFeature([User])` | Not Started |

### 2.2 Auth module (register, login, refresh, me)
| # | Task | Status |
|---|---|---|
| 1 | Create `auth.module.ts`, `auth.controller.ts`, `auth.service.ts` | Not Started |
| 2 | **Register** — `POST /api/v1/auth/register` | Not Started |
|   | DTO: `email` (IsEmail), `password` (MinLength 8), `name` (IsString) | |
|   | Hash password, save user, return access + refresh tokens | |
|   | Reject duplicate email (409 Conflict) | |
| 3 | **Login** — `POST /api/v1/auth/login` | Not Started |
|   | DTO: `email`, `password` | |
|   | Validate credentials, return access + refresh tokens | |
|   | Invalid credentials → 401 | |
| 4 | **Refresh** — `POST /api/v1/auth/refresh` | Not Started |
|   | DTO: `refreshToken` | |
|   | Validate refresh token, rotate (issue new pair, invalidate old) | |
|   | Invalid/expired → 401 | |
| 5 | **Me** — `GET /api/v1/auth/me` (protected) | Not Started |
|   | Return `{ id, email, name, createdAt }` from token | |
| 6 | Store refresh tokens (hashed) — either in User entity or separate table | Not Started |
| 7 | Invalidate refresh token on logout (optional in Phase 1, but token rotation required) | Not Started |
| 8 | Rate limiting on auth endpoints (login, register, refresh) | Not Started |
| 9 | Unit tests: register success/duplicate, login success/fail, refresh valid/expired, me returns user | Not Started |

### 2.3 JWT strategy + guards
| # | Task | Status |
|---|---|---|
| 1 | Install `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt` | Not Started |
| 2 | Configure `JwtModule.register()` — secret from env, 15min expiry for access token | Not Started |
| 3 | Create `JwtStrategy` (passport-jwt) — extract from Bearer header, validate, attach user to request | Not Started |
| 4 | Create `JwtAuthGuard` in `common/guards/jwt-auth.guard.ts` — global guard | Not Started |
| 5 | Create `@Public()` decorator in `common/decorators/public.decorator.ts` — bypass auth | Not Started |
| 6 | Create `@CurrentUser()` param decorator in `common/decorators/current-user.decorator.ts` | Not Started |
| 7 | Register `JwtAuthGuard` as global guard (`APP_GUARD`) | Not Started |
| 8 | Mark auth routes as `@Public()` (register, login, refresh) | Not Started |
| 9 | Unit tests: guard rejects missing/invalid token, allows valid token, `@Public()` bypasses | Not Started |

### 2.4 Client: auth pages (login, register)
| # | Task | Status |
|---|---|---|
| 1 | Create `(auth)/layout.tsx` — centered card layout, no sidebar | Not Started |
| 2 | Create `(auth)/login/page.tsx` — email + password form, submit → `POST /auth/login` | Not Started |
| 3 | Create `(auth)/register/page.tsx` — name + email + password form, submit → `POST /auth/register` | Not Started |
| 4 | Create API client (`lib/api.ts`) — fetch wrapper with base URL, token attachment, 401 → refresh → retry | Not Started |
| 5 | Create auth context/store — store access token in memory, refresh token in localStorage | Not Started |
| 6 | Handle form validation (inline errors), loading state, server error display | Not Started |
| 7 | On success: store tokens, redirect to `/projects` | Not Started |
| 8 | Link between login ↔ register pages | Not Started |

### 2.5 Client: protected route layout
| # | Task | Status |
|---|---|---|
| 1 | Create `(dashboard)/layout.tsx` — sidebar navigation + top header + breadcrumbs | Not Started |
| 2 | Auth check: redirect to `/login` if no valid token | Not Started |
| 3 | Fetch current user via `GET /auth/me` on mount | Not Started |
| 4 | Sidebar: project selector (placeholder), nav links (Projects, etc.) | Not Started |
| 5 | Root page (`/`) → redirect to `/projects` | Not Started |

---

## 3. Projects (end-to-end)

### 3.1 Project CRUD
| # | Task | Status |
|---|---|---|
| 1 | Create `project.entity.ts` — UUID PK, `name`, `description`, `createdAt` | Not Started |
| 2 | Create `project-member.entity.ts` — composite relation: `userId`, `projectId`, `role` (UserRole enum) | Not Started |
| 3 | Create `projects.module.ts`, `projects.controller.ts`, `projects.service.ts` | Not Started |
| 4 | **Create** — `POST /api/v1/projects` | Not Started |
|   | DTO: `name` (IsString), `description` (IsString, optional) | |
|   | Creator automatically becomes `ADMIN` member | |
| 5 | **List** — `GET /api/v1/projects` | Not Started |
|   | Return only projects where current user is a member | |
|   | Include user's role per project | |
|   | Paginated: `?page=1&limit=20` → `{ data, meta }` | |
| 6 | **Detail** — `GET /api/v1/projects/:id` | Not Started |
|   | Include members list: `[{ userId, name, email, role }]` | |
|   | 403 if user is not a member | |
| 7 | **Update** — `PATCH /api/v1/projects/:id` (Admin only) | Not Started |
| 8 | **Delete** — `DELETE /api/v1/projects/:id` (Admin only) | Not Started |
| 9 | Unit tests: CRUD operations, membership filtering, admin-only enforcement | Not Started |

### 3.2 Roles guard + @Roles() decorator
| # | Task | Status |
|---|---|---|
| 1 | Create `@Roles()` metadata decorator in `common/decorators/roles.decorator.ts` | Not Started |
| 2 | Create `RolesGuard` in `common/guards/roles.guard.ts` | Not Started |
|   | Read `@Roles()` metadata from handler | |
|   | Look up user's role in the target project (from route param `:id` or `:projectId`) | |
|   | If no `@Roles()`, allow all authenticated users | |
|   | If role insufficient → 403 Forbidden | |
| 3 | Register `RolesGuard` as global guard (after `JwtAuthGuard`) | Not Started |
| 4 | Unit tests: role check pass/fail, no-roles-required pass, missing membership → 403 | Not Started |

### 3.3 Project member management
| # | Task | Status |
|---|---|---|
| 1 | **Add member** — `POST /api/v1/projects/:id/members` (Admin only) | Not Started |
|   | DTO: `email` (IsEmail), `role` (IsEnum UserRole) | |
|   | Look up user by email, create ProjectMember | |
|   | 404 if user not found, 409 if already a member | |
| 2 | **Update role** — `PATCH /api/v1/projects/:id/members/:userId` (Admin only) | Not Started |
|   | DTO: `role` (IsEnum UserRole) | |
| 3 | **Remove member** — `DELETE /api/v1/projects/:id/members/:userId` (Admin only) | Not Started |
|   | Prevent removing the last Admin | |
| 4 | Unit tests: add/update/remove member, duplicate prevention, last-admin guard | Not Started |

### 3.4 Client: project list + detail pages
| # | Task | Status |
|---|---|---|
| 1 | Create `projects/page.tsx` — table of user's projects (name, role, created date) | Not Started |
| 2 | Empty state: "No projects yet. Create one." + button | Not Started |
| 3 | Create project dialog/page — name + description form | Not Started |
| 4 | Create `projects/[projectId]/page.tsx` — project overview with members list | Not Started |
| 5 | Create `projects/[projectId]/settings/page.tsx` — member management (invite, change role, remove) | Not Started |
| 6 | Skeleton loading states for all views | Not Started |

---

## 4. User Stories (end-to-end)

### 4.1 User Story CRUD + verification steps
| # | Task | Status |
|---|---|---|
| 1 | Create `user-story.entity.ts` — UUID PK, `projectId` (FK), `title`, `description`, `priority` (enum), `status` (StoryStatus enum), `createdAt`, `updatedAt` | Not Started |
| 2 | Create `verification-step.entity.ts` — UUID PK, `storyId` (FK), `order` (int), `instruction` (text) | Not Started |
| 3 | Create `user-stories.module.ts`, `user-stories.controller.ts`, `user-stories.service.ts` | Not Started |
| 4 | **Create** — `POST /api/v1/projects/:projectId/stories` | Not Started |
|   | Roles: Admin, PM, Developer | |
|   | DTO: `title`, `description`, `priority`, `steps[]` (each: `order`, `instruction`) | |
|   | Save story + steps in single transaction | |
| 5 | **List** — `GET /api/v1/projects/:projectId/stories` | Not Started |
|   | Query: `?status=ACTIVE&priority=HIGH&search=...&page=1&limit=20` | |
|   | Return `{ data: [...], meta }` with step count per story | |
| 6 | **Detail** — `GET /api/v1/stories/:id` | Not Started |
|   | Include full steps array ordered by `order` | |
| 7 | **Update** — `PATCH /api/v1/stories/:id` | Not Started |
|   | Roles: Admin, PM, Developer | |
|   | Partial update — all fields optional | |
|   | Steps: with `id` → update, without `id` → create, missing from array → delete | |
| 8 | **Delete** — `DELETE /api/v1/stories/:id` | Not Started |
|   | Roles: Admin, PM | |
|   | Hard delete (cascade steps) | |
| 9 | Unit tests: CRUD, step sync logic (create/update/delete), role enforcement, pagination | Not Started |

### 4.2 Client: story list + create/edit pages
| # | Task | Status |
|---|---|---|
| 1 | Create `stories/page.tsx` — table (title, priority badge, status badge, step count, actions) | Not Started |
| 2 | Sortable columns, row action dropdown (edit, delete) | Not Started |
| 3 | Empty state: "No stories yet. Create one." + button | Not Started |
| 4 | Create `stories/new/page.tsx` — form: title, description, priority selector | Not Started |
| 5 | Dynamic step list: add/remove/reorder verification steps | Not Started |
| 6 | Create `stories/[storyId]/page.tsx` — detail/edit view with steps | Not Started |
| 7 | Inline validation, submit button bottom-right | Not Started |
| 8 | Delete confirmation dialog | Not Started |
| 9 | Toast notifications: success/error on create/update/delete | Not Started |
| 10 | Skeleton loading states | Not Started |

---

## Execution Order
```
Infrastructure ──► Auth ──► Projects ──► User Stories
     1.1              2.1       3.1            4.1
     1.2              2.2       3.2            4.2
     1.3              2.3       3.3
                      2.4       3.4
                      2.5
```
Each feature is fully completed (server + client + tests) before moving to the next.

## Definition of Done (per feature)
- All server endpoints implemented with DTOs and validation
- Unit tests passing for service methods, guards, and pipes
- Client pages functional with loading/error/empty states
- Lint passes (`npm run lint`) in both client and server
- Manual smoke test via Docker Compose
