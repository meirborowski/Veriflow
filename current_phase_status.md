# Phase 2 — Release Engine (Detailed Plan)

## Overview
Release CRUD, story-to-release scoping, release close with snapshot freeze, release dashboard — built end-to-end (server + client per feature).

**Key concept**: A Release groups User Stories into a testable scope. In `DRAFT` state, stories can be added/removed. On close, the scope is frozen — immutable snapshots (`ReleaseStory` / `ReleaseStoryStep`) are created so edits to master stories never affect in-progress testing.

**Scoping mechanism**: A lightweight join table (`release_scoped_stories`) tracks which master stories are in a draft release's scope. On close, the system reads the scoping table, copies each story + its steps into snapshot entities, and sets the release status to `CLOSED`.

---

## 1. Release Entities + Guard Extension

### 1.1 Release entity
| # | Task | Status |
|---|---|---|
| 1 | Create `releases/entities/release.entity.ts` — UUID PK, `projectId` (FK → Project), `name`, `status` (ReleaseStatus enum, default DRAFT), `createdAt`, `closedAt` (nullable timestamptz) | Done |
| 2 | Relations: `@ManyToOne(() => Project)`, `@OneToMany(() => ReleaseStory)` | Done |

### 1.2 Snapshot entities
| # | Task | Status |
|---|---|---|
| 1 | Create `releases/entities/release-story.entity.ts` — UUID PK, `releaseId` (FK → Release), `sourceStoryId` (FK → UserStory), `title`, `description`, `priority` (Priority enum) | Done |
|   | These fields are copied from the master story at close time — immutable after creation | |
| 2 | Create `releases/entities/release-story-step.entity.ts` — UUID PK, `releaseStoryId` (FK → ReleaseStory), `order` (int), `instruction` (text) | Done |
|   | Copied from VerificationStep at close time — immutable after creation | |
| 3 | Relations: ReleaseStory `@OneToMany(() => ReleaseStoryStep)`, cascade delete | Done |

### 1.3 Scoping join table
| # | Task | Status |
|---|---|---|
| 1 | Create many-to-many relation on Release entity: `@ManyToMany(() => UserStory)` with `@JoinTable({ name: 'release_scoped_stories' })` | Done |
|   | Join table columns: `releaseId`, `storyId` — tracks draft scope | |
|   | On close, this table is read to build snapshots; rows remain for traceability | |

### 1.4 Extend @ResolveProjectFrom for release routes
| # | Task | Status |
|---|---|---|
| 1 | Update `resolve-project.decorator.ts` — add `'release'` to the source union type | Done |
| 2 | Update `roles.guard.ts` — add `'release'` branch: look up `Release` by `request.params.id`, extract `projectId` | Done |
| 3 | Unit tests: resolve project from release ID, reject non-existent release | Done |

---

## 2. Release CRUD

### 2.1 Module + Service + Controller
| # | Task | Status |
|---|---|---|
| 1 | Create `releases/releases.module.ts` — register entities (Release, ReleaseStory, ReleaseStoryStep, ProjectMember, UserStory, VerificationStep) in `TypeOrmModule.forFeature` | Done |
| 2 | Create `releases/releases.service.ts` with `Logger` | Done |
| 3 | Create `releases/releases.controller.ts` with `@UseGuards(RolesGuard)` | Done |
| 4 | Register `ReleasesModule` in `AppModule` | Done |

### 2.2 Create release
| # | Task | Status |
|---|---|---|
| 1 | **POST** `/api/v1/projects/:projectId/releases` | Done |
|   | Roles: Admin, PM | |
|   | DTO: `name` (IsString, MinLength 1, MaxLength 255) | |
|   | Creates release with `status = DRAFT`, `closedAt = null` | |
|   | Returns: `{ id, projectId, name, status, createdAt }` | |

### 2.3 List releases
| # | Task | Status |
|---|---|---|
| 1 | **GET** `/api/v1/projects/:projectId/releases` | Done |
|   | Roles: Admin, PM, Developer, Tester (any project member) | |
|   | Query: `?status=DRAFT&page=1&limit=20` | |
|   | Return: `{ data: [{ id, name, status, storyCount, createdAt, closedAt }], meta }` | |
|   | `storyCount`: count of scoped stories (draft) or snapshot stories (closed) | |

### 2.4 Get release detail
| # | Task | Status |
|---|---|---|
| 1 | **GET** `/api/v1/releases/:id` | Done |
|   | Roles: any project member, resolved via `@ResolveProjectFrom('release')` | |
|   | **Draft**: return release info + scoped stories (from join table → master UserStory data) | |
|   | **Closed**: return release info + ReleaseStory snapshots with ReleaseStoryStep arrays | |
|   | Include `closedAt` (null for draft) | |

### 2.5 Update release
| # | Task | Status |
|---|---|---|
| 1 | **PATCH** `/api/v1/releases/:id` | Done |
|   | Roles: Admin, PM | |
|   | `@ResolveProjectFrom('release')` | |
|   | DTO: `name` (IsString, IsOptional, MinLength 1, MaxLength 255) | |
|   | Guard: only when `status = DRAFT` → else 409 Conflict ("Release is already closed") | |

### 2.6 Delete release
| # | Task | Status |
|---|---|---|
| 1 | **DELETE** `/api/v1/releases/:id` | Done |
|   | Roles: Admin, PM | |
|   | `@ResolveProjectFrom('release')` | |
|   | Guard: only when `status = DRAFT` → else 409 Conflict | |
|   | Hard delete — cascades scoping rows and any snapshot rows | |

### 2.7 DTOs
| # | Task | Status |
|---|---|---|
| 1 | Create `releases/dto/create-release.dto.ts` — `name: string` | Done |
| 2 | Create `releases/dto/update-release.dto.ts` — `name?: string` | Done |
| 3 | Create `releases/dto/release-query.dto.ts` — `status?: ReleaseStatus`, `page`, `limit` | Done |
| 4 | Create `releases/dto/add-stories.dto.ts` — `storyIds: string[]` (IsArray, each IsUUID) | Done |

### 2.8 Unit tests
| # | Task | Status |
|---|---|---|
| 1 | Service tests: create, list with pagination, detail (draft + closed), update, delete | Done |
| 2 | Service tests: draft-only enforcement (update/delete on closed → 409) | Done |
| 3 | Controller tests: route wiring, DTO validation, HTTP status codes | Done |

---

## 3. Story-to-Release Scoping

### 3.1 Add stories to release
| # | Task | Status |
|---|---|---|
| 1 | **POST** `/api/v1/releases/:id/stories` | Done |
|   | Roles: Admin, PM | |
|   | `@ResolveProjectFrom('release')` | |
|   | DTO: `storyIds` (IsArray, ArrayMinSize 1, each IsUUID) | |
|   | Validate: release is DRAFT → else 409 | |
|   | Validate: all stories exist and belong to the same project as the release | |
|   | Skip already-scoped stories (idempotent) | |
|   | Return: `{ added: <number of newly added> }` | |

### 3.2 Remove story from release
| # | Task | Status |
|---|---|---|
| 1 | **DELETE** `/api/v1/releases/:id/stories/:storyId` | Done |
|   | Roles: Admin, PM | |
|   | `@ResolveProjectFrom('release')` | |
|   | Validate: release is DRAFT → else 409 | |
|   | Remove scoping link from join table | |
|   | 404 if story not in release scope | |

### 3.3 Unit tests
| # | Task | Status |
|---|---|---|
| 1 | Add stories: success, skip duplicates, cross-project rejection, closed-release rejection | Done |
| 2 | Remove story: success, not-in-scope 404, closed-release rejection | Done |

---

## 4. Release Close → Snapshot

### 4.1 Close endpoint
| # | Task | Status |
|---|---|---|
| 1 | **POST** `/api/v1/releases/:id/close` | Done |
|   | Roles: Admin, PM | |
|   | `@ResolveProjectFrom('release')` | |
|   | Validate: release is DRAFT → else 409 ("Release is already closed") | |
|   | Validate: at least 1 story in scope → else 400 ("Cannot close release with no stories") | |
| 2 | **Transaction** (via `DataSource.transaction`): | Done |
|   | For each scoped story: | |
|   |   — Read master UserStory + VerificationSteps | |
|   |   — Create `ReleaseStory` (copy title, description, priority, sourceStoryId) | |
|   |   — Create `ReleaseStoryStep` per step (copy order, instruction) | |
|   | Set `release.status = CLOSED` | |
|   | Set `release.closedAt = new Date()` | |
| 3 | Return: `{ id, name, status, closedAt, storyCount }` | Done |
| 4 | Log: `Release closed: id=<id>, project=<projectId>, stories=<count>` | Done |

### 4.2 Unit tests
| # | Task | Status |
|---|---|---|
| 1 | Close success: snapshots created with correct data, status updated, closedAt set | Done |
| 2 | Close with empty scope → 400 | Done |
| 3 | Close already-closed release → 409 | Done |
| 4 | Snapshot integrity: verify copied fields match master story/step data | Done |

---

## 5. Client: Release Types + Hooks

### 5.1 Release types
| # | Task | Status |
|---|---|---|
| 1 | Create `client/src/types/releases.ts` — `Release`, `ReleaseDetail`, `ReleaseStory`, `ReleaseStoryStep`, `CreateReleasePayload`, `AddStoriesPayload` | Done |

### 5.2 Release hooks
| # | Task | Status |
|---|---|---|
| 1 | Create `client/src/hooks/use-releases.ts` — query key factory (`releaseKeys`) | Done |
| 2 | `useReleases(projectId, params)` — paginated list query | Done |
| 3 | `useRelease(releaseId)` — detail query | Done |
| 4 | `useCreateRelease(projectId)` — mutation + invalidation + toast | Done |
| 5 | `useUpdateRelease(releaseId)` — mutation + invalidation + toast | Done |
| 6 | `useDeleteRelease(projectId)` — mutation + invalidation + toast | Done |
| 7 | `useAddStoriesToRelease(releaseId)` — mutation + invalidation + toast | Done |
| 8 | `useRemoveStoryFromRelease(releaseId)` — mutation + invalidation + toast | Done |
| 9 | `useCloseRelease(releaseId)` — mutation + invalidation + toast | Done |

---

## 6. Client: Release List + Create

### 6.1 Release list page
| # | Task | Status |
|---|---|---|
| 1 | Create `releases/page.tsx` — table (name, status badge, story count, created date, closed date) | Done |
| 2 | Row actions: view detail, delete (draft only) | Done |
| 3 | Status filter dropdown (All, Draft, Closed) | Done |
| 4 | Empty state: "No releases yet. Create one." + button | Done |
| 5 | Skeleton loading state | Done |

### 6.2 Create release
| # | Task | Status |
|---|---|---|
| 1 | Create release dialog (triggered from list page) — name input, submit | Done |
| 2 | Inline validation, loading state, error display | Done |
| 3 | On success: redirect to release detail page | Done |

---

## 7. Client: Release Detail + Scoping

### 7.1 Release detail page
| # | Task | Status |
|---|---|---|
| 1 | Create `releases/[releaseId]/page.tsx` — release overview header (name, status badge, dates) | Done |
| 2 | **Draft state**: show scoped stories table (title, priority badge, step count, remove action) | Done |
| 3 | **Closed state**: show snapshot stories table (title, priority badge, step count — read-only) | Done |
| 4 | Skeleton loading state | Done |

### 7.2 Scoping UI (draft only)
| # | Task | Status |
|---|---|---|
| 1 | "Add Stories" button → dialog showing project stories not yet in release | Done |
| 2 | Multi-select story list with checkboxes, search/filter | Done |
| 3 | Submit → `POST /releases/:id/stories` with selected IDs | Done |
| 4 | Remove action per row → `DELETE /releases/:id/stories/:storyId` with confirmation | Done |

### 7.3 Close release action
| # | Task | Status |
|---|---|---|
| 1 | "Close Release" button (visible only in draft state, disabled if 0 stories) | Done |
| 2 | Confirmation dialog: "This will freeze the scope. This action cannot be undone." | Done |
| 3 | On success: refresh page to show closed state with snapshots | Done |

---

## 8. Client: Release Dashboard (Closed)

### 8.1 Dashboard view
| # | Task | Status |
|---|---|---|
| 1 | Summary card: total stories, breakdown by priority | Done |
| 2 | Story list with priority badges, step count, expandable step details | Done |
| 3 | Status badges for release state | Done |
|   | Note: test execution status per story will be added in Phase 3 | |

---

## 9. Navigation + Integration

### 9.1 Navigation links
| # | Task | Status |
|---|---|---|
| 1 | Add "Releases" link to project sidebar navigation | Done |
| 2 | Add release count or link on project detail page | Done |
| 3 | ReleaseStatusBadge shared component (Draft = neutral/blue, Closed = green/solid) | Done |

---

## Execution Order
```
Entities + Guard ──► Release CRUD ──► Scoping ──► Close/Snapshot ──► Client
     1.1                 2.1            3.1           4.1             5.1
     1.2                 2.2            3.2           4.2             5.2
     1.3                 2.3            3.3                           6.1
     1.4                 2.4                                         6.2
                         2.5                                         7.1
                         2.6                                         7.2
                         2.7                                         7.3
                         2.8                                         8.1
                                                                     9.1
```
Server-side features are built and tested sequentially (entities → CRUD → scoping → close).
Client features are built after all server endpoints are complete.

## Definition of Done (per feature)
- All server endpoints implemented with DTOs and validation
- Unit tests passing for service methods, guards, and controller routes
- Client pages functional with loading/error/empty states
- Lint passes (`npm run lint`) in both client and server
- Manual smoke test via Docker Compose
