# Development Guide

## Commands

### Docker (Recommended)

```bash
cp .env.example .env              # First time only
docker compose up --build         # Start all services with hot-reload
docker compose up -d              # Start in background
docker compose down               # Stop all services
docker compose down -v            # Stop and wipe volumes (resets DB)
docker compose logs -f server     # Tail server logs
```

### Server (NestJS)

```bash
cd server
npm run start:dev          # Dev server with hot-reload (port 3001)
npm run build              # Production build
npm run test               # Unit tests
npm run test:e2e           # E2E tests (requires PostgreSQL)
npm run test:integration   # Integration tests (requires PostgreSQL)
npm run lint               # ESLint
npm run format             # Prettier
```

### Client (Next.js)

```bash
cd client
npm run dev                # Dev server (port 3000)
npm run build              # Production build
npm run lint               # ESLint
npm run test:e2e           # Playwright E2E tests
```

---

## Project Structure

```
client/          → Next.js 16 frontend (port 3000)
server/          → NestJS 11 backend (port 3001)
  src/
    auth/
    projects/
    user-stories/
    releases/
    test-execution/
    bugs/
    notifications/
    export/
    attachments/
    automation/
    common/        → Guards, decorators, pipes, interceptors
worker/          → Test Worker service (Playwright execution)
cli/             → @veriflow/cli — tunnel for local testing
k8s/             → Kubernetes manifests (RBAC, Job template)
```

---

## Testing Strategy

### Unit Tests
- Colocated with source files (`*.spec.ts`).
- Repositories are mocked.
- Every new service method, guard, pipe, or non-trivial utility must have unit tests.

```bash
cd server && npm run test
```

### E2E Tests
- Full HTTP stack against a real `veriflow_test` PostgreSQL database.
- Live in `server/test/e2e/`.
- Always add E2E tests when adding or changing REST endpoints.

```bash
cd server && npm run test:e2e
```

### Integration Tests
- Service-level tests with real DB for transactions, locks, and cascades.
- Live in `server/test/integration/`.
- Required for: transactions, pessimistic locks, cascade deletes, complex multi-table queries.

```bash
cd server && npm run test:integration
```

### Test Helpers
Shared helpers live in `server/test/helpers/`. Never mock the DB in E2E or integration tests.

### Before Opening a PR
```bash
cd server && npm run test
cd server && npm run test:e2e
cd server && npm run test:integration
cd server && npm run lint
cd client && npm run lint
```

---

## Naming Conventions

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
| Enums | PascalCase name + UPPER_SNAKE members | `TestStatus.IN_PROGRESS` |
| DB tables | snake_case (plural) | `user_stories` |
| DB columns | snake_case | `project_id` |
| API JSON keys | camelCase | `projectId` |
| WebSocket events | kebab-case | `request-work` |
| Interfaces / Types | PascalCase (no `I` prefix) | `PaginatedResponse` |
| Environment vars | UPPER_SNAKE_CASE | `DATABASE_URL` |

---

## Git Workflow

### Branch Strategy

```
main                  ← production-ready, always stable
  ├── feat/...        ← new features
  ├── fix/...         ← bug fixes
  ├── refactor/...    ← code restructuring
  └── chore/...       ← tooling, config, deps
```

- Never push directly to `main`.
- Always create a branch off `main` for every change.
- Merge via PR with `--rebase` or `--squash`. Never `--merge`.

### Commit Messages

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

---

## Code Rules

- **No `any` types** — use proper TypeScript. Use `unknown` when type is uncertain.
- **No business logic in controllers** — controllers validate input and delegate to services.
- **Always add unit tests** — every new service method, guard, pipe, or non-trivial utility.
- **Never modify passing tests** unless the underlying production behavior changed.
- **No silent catches** — use NestJS exception filters and proper HTTP status codes.
- **Parameterized queries only** — no raw string concatenation in SQL/TypeORM.
- **Validate all input** — every endpoint uses DTOs with class-validator.
- **Never log secrets** — passwords, tokens, refresh tokens, or PII beyond user ID must never appear in logs.

---

## Changelog

Always update `changelog.md` after completing meaningful work. Format:

```markdown
## YYYY-MM-DD
- feat: <what was added>
- fix: <what was fixed>
- refactor: <what was restructured>
- chore: <tooling/config changes>
- docs: <documentation updates>
```
