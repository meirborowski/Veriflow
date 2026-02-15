# Veriflow

## Project Goals
Replace spreadsheet-based QA tracking with a real-time collaborative platform. **"The Requirement IS the Test Case"** — every User Story doubles as its test script.

- Users belong to projects with roles (`Admin`, `PM`, `Developer`, `Tester`)
- User Stories contain verification steps that testers execute directly
- Releases freeze a snapshot of stories; testing runs against the snapshot
- Real-time "Test Swarm" assigns stories to testers with no double-booking
- `Fail` verdict creates a Bug entity linked to the story and execution
- Full execution history — every test attempt is its own record
- Disconnect discards partial work; story reverts to `Untested`

## Current Milestone
**Phase 1 — Foundation**: Auth (JWT), Project CRUD, User Story CRUD, Role-based access control.

## Architecture Overview

### Tech Stack
| Layer | Technology |
|---|---|
| Client | Next.js 16 (App Router), Tailwind CSS v4, TypeScript |
| Server | NestJS 11, TypeScript |
| Database | PostgreSQL + TypeORM |
| Real-time | Socket.io (NestJS Gateway) |
| Auth | JWT (access + refresh tokens) |
| Validation | class-validator / class-transformer |
| Testing | Jest |

### Project Structure
```
client/                  → Next.js 16 frontend (port 3000)
server/                  → NestJS 11 backend (port 3001)
  src/
    auth/                → JWT auth (register, login, refresh)
    projects/            → Project CRUD + member management
    user-stories/        → Story CRUD + verification steps
    releases/            → Release lifecycle + snapshot freeze
    test-execution/      → WebSocket gateway + execution log
    bugs/                → Defect tracking
    common/              → Guards, decorators, pipes, interceptors
```

## Design & Style Guide

### Visual Identity
- **Aesthetic**: Clean, professional, tool-focused — not flashy. Think Linear/Notion, not Dribbble.
- **Color palette**: Neutral base (slate/gray) with semantic accent colors for status states.
- **Typography**: System font stack. Single typeface. Clear hierarchy via weight and size, not variety.

### Status Colors
Consistent across all views (dashboard, cards, badges, charts):

| Status | Color Intent |
|---|---|
| `Untested` | Neutral/gray |
| `In Progress` | Blue |
| `Pass` | Green |
| `Fail` | Red |
| `Partially Tested` | Amber/yellow |
| `Can't Be Tested` | Muted/disabled gray |

Bug severity follows the same heat scale: `Critical` = red, `Major` = orange, `Minor` = yellow, `Trivial` = gray.

### Layout Principles
- **Sidebar navigation**: Project-scoped. Switch projects from a top-level selector.
- **Content area**: Single-column for forms/detail views. Table/grid for list views.
- **No modals for core workflows** — use full pages or slide-over panels. Modals only for confirmations and quick actions.
- **Breadcrumbs** on all nested pages (e.g., Project > Release > Test Runner).

### Component Patterns
- **Tables**: Sortable columns, row actions via dropdown menu, bulk selection where relevant.
- **Forms**: Labels above inputs. Inline validation. Submit button bottom-right.
- **Empty states**: Always show a message + primary action (e.g., "No stories yet. Create one.").
- **Loading**: Skeleton placeholders, not spinners (except inline actions).
- **Toasts**: Bottom-right. Success = green, Error = red, Info = blue. Auto-dismiss after 5s.

### Test Runner UI
- **Step-by-step layout**: Vertical checklist. Each step shows instruction + pass/fail/skip toggle.
- **Current story prominent**: Title, description, and steps fill the main area.
- **Sidebar or top bar**: Live progress summary (X of Y tested, pass/fail counts).
- **Real-time presence**: Show who else is testing (avatars/names in the session).

### Responsiveness
- **Primary target**: Desktop (1280px+). This is a work tool, not a consumer app.
- **Minimum supported**: 1024px. Below that, show a "best on desktop" notice.
- **No mobile layout required** for v1.

### Accessibility Baseline
- All interactive elements keyboard-navigable.
- Color is never the only indicator — always pair with icons or text labels.
- Minimum contrast ratio: 4.5:1 for text.

## Constraints & Policies

### Security
- **Never commit secrets** — `.env`, API keys, JWTs, and credentials must stay in `.env` files and `.gitignore`.
- **Hash all passwords** with bcrypt. Never store plaintext.
- **Validate all input** — every endpoint uses DTOs with class-validator. Trust nothing from the client.
- **Sanitize output** — escape user-generated content before rendering to prevent XSS.
- **Parameterized queries only** — no raw string concatenation in SQL/TypeORM queries.
- **Auth on every route** — Bearer token required. Only `/auth/register`, `/auth/login`, `/auth/refresh` are public.
- **Role enforcement via guards** — check permissions server-side on every mutation. Never rely on client-side role checks.
- **Short-lived access tokens** — refresh token rotation. Invalidate refresh tokens on logout.
- **Rate limiting** on auth endpoints (login, register, refresh) to prevent brute force.
- **CORS** — restrict origins to the client domain only.
- **No sensitive data in logs** — never log passwords, tokens, refresh tokens, or PII beyond user ID.
- **No sensitive data in URLs** — tokens and secrets go in headers or body, never query params.

### Data Integrity
- **All entities use UUID v4** — never auto-increment IDs.
- **Timestamps in ISO 8601** — stored as `timestamptz` in PostgreSQL.
- **Soft-delete is not used** — deletes are hard deletes unless explicitly specified.
- **Release snapshots are immutable** — once a release is closed, `ReleaseStory` and `ReleaseStoryStep` rows are never modified.
- **Test execution rows are append-only** — never update a completed execution; create a new attempt.

### Code Rules
- **Minimal changes only** — touch only what is necessary to complete the task. Do not refactor, restyle, reformat, or "improve" surrounding code. No drive-by cleanups, no adding comments/docstrings to untouched code, no reorganizing imports or files that aren't part of the change. If it works and isn't broken, leave it alone.
- **Package Manager**: npm only.
- **Node.js**: v20.12.2.
- **Error Handling**: NestJS exception filters + proper HTTP status codes. No silent catches.
- **API Prefix**: All REST routes under `/api/v1`.
- **Pagination**: `?page=1&limit=20` → `{ data, meta: { total, page, limit, totalPages } }`.
- **Error format**: `{ statusCode, message, error }`.
- **Logging**: NestJS `Logger` per module. Log business events at `log` level.
- **No `any` types** — use proper TypeScript types everywhere. `unknown` over `any` when type is uncertain.
- **No business logic in controllers** — controllers validate input and delegate to services.
- **Always add unit tests** — every new service method, guard, pipe, or non-trivial utility must have corresponding unit tests in a colocated `*.spec.ts` file. No new code without tests.
- **Never modify existing tests unless the underlying logic changed** — if the production code behavior is unchanged, its tests must remain untouched. Do not "fix", reformat, or "improve" passing tests as part of an unrelated change.

### Naming Conventions

| Context | Convention | Example |
|---|---|---|
| NestJS files | kebab-case + suffix | `user-stories.service.ts` |
| TypeORM entities | kebab-case + `.entity.ts` | `user-story.entity.ts` |
| DTOs | kebab-case + `.dto.ts` | `create-story.dto.ts` |
| React components | PascalCase | `StoryCard.tsx` |
| Hooks | camelCase + `use` prefix | `useStories.ts` |
| Classes | PascalCase | `UserStoriesService` |
| Functions / Variables | camelCase | `findByProject()` |
| Constants | UPPER_SNAKE_CASE | `HEARTBEAT_INTERVAL` |
| Enums | PascalCase + UPPER_SNAKE members | `TestStatus.IN_PROGRESS` |
| DB tables | snake_case (plural) | `user_stories` |
| DB columns | snake_case | `project_id` |
| API JSON keys | camelCase | `projectId` |
| WebSocket events | kebab-case | `request-work` |
| Interfaces / Types | PascalCase (no `I` prefix) | `PaginatedResponse` |
| Environment vars | UPPER_SNAKE_CASE | `DATABASE_URL` |

## Repository Etiquette

### Branch Strategy
```
main                    ← production-ready, always stable
  └── develop           ← integration branch, all features merge here
        ├── feat/...    ← new features
        ├── fix/...     ← bug fixes
        ├── refactor/...← code restructuring
        └── chore/...   ← tooling, config, deps
```

### Branch Naming
Format: `<type>/<short-description>`

| Type | Use | Example |
|---|---|---|
| `feat` | New feature | `feat/auth-jwt` |
| `fix` | Bug fix | `fix/release-close-validation` |
| `refactor` | Code restructuring | `refactor/story-service` |
| `chore` | Tooling, config, deps | `chore/eslint-config` |
| `docs` | Documentation only | `docs/api-spec` |
| `test` | Adding or fixing tests | `test/release-e2e` |

### Rules
- **Never push directly to `main`** — all changes go through `develop` first.
- **Never commit directly to `develop`** — always create a new branch (`feat/`, `fix/`, `chore/`, etc.) off `develop` for every change, no matter how small. Commit to the branch, push, and merge via PR.
- **`develop` → `main`** only via PR when a milestone/phase is stable and tested.
- **Feature branches** branch off `develop` and merge back into `develop` via PR.
- **Keep branches short-lived** — merge frequently, delete after merge.
- **Rebase feature branches** on `develop` before opening a PR to keep history clean.

### Commit Messages
Format: `<type>: <short summary>`

```
feat: add JWT auth with access and refresh tokens
fix: prevent double-booking in story assignment
refactor: extract snapshot logic into separate service
chore: add eslint and prettier config
test: add e2e tests for release close endpoint
```

- Imperative mood ("add", not "added").
- Under 72 characters.
- No period at the end.
- Body optional — for *why*, not *what*.

### PR Rules
- Short description of what changed and why.
- PRs into `develop` — self-merge after checks pass.
- PRs into `main` — require explicit approval.

## Commands

### Docker (Recommended)
| Command | Description |
|---|---|
| `cp .env.example .env` | Create env file from template (first time only) |
| `docker compose up --build` | Start all services with hot-reload |
| `docker compose up -d` | Start in background |
| `docker compose down` | Stop all services |
| `docker compose down -v` | Stop and remove volumes (resets DB) |
| `docker compose logs -f server` | Tail server logs |

### Client
| Command | Description |
|---|---|
| `cd client && npm run dev` | Start dev server (port 3000) |
| `cd client && npm run build` | Production build |
| `cd client && npm run lint` | Run linter |

### Server
| Command | Description |
|---|---|
| `cd server && npm run start:dev` | Start dev server (port 3001) |
| `cd server && npm run build` | Production build |
| `cd server && npm run test` | Run unit tests |
| `cd server && npm run test:e2e` | Run E2E tests |
| `cd server && npm run format` | Format code (Prettier) |
| `cd server && npm run lint` | Run linter |

## Testing
- **Unit tests**: Jest — colocated with source files (`*.spec.ts`)
- **E2E tests**: `server/test/` directory
- **Run before PR**: `npm run test` and `npm run lint` in both client and server
- **Coverage target**: Focus on services and business logic, not boilerplate

## Documentation
- [README.md](README.md) — Project overview and philosophy
- [project_spec.md](project_spec.md) — Full specification: data model, API design, WebSocket events, logging, development phases
- [architecture.md](architecture.md) — System diagram, layer responsibilities, data flows, DB schema, WebSocket internals
- [project_status.md](project_status.md) — Phase progress, task tracking, blockers, decisions log
- [changelog.md](changelog.md) — Running log of all changes to the project

### Changelog Rule
**Always update `changelog.md`** after completing any meaningful work. Every entry must include the date and a short description of what changed. Group entries under the current date. Format:

```markdown
## YYYY-MM-DD
- feat: <what was added>
- fix: <what was fixed>
- refactor: <what was restructured>
- chore: <tooling/config changes>
- docs: <documentation updates>
```

Do not skip this step. If multiple changes happen on the same day, append to that day's section.
