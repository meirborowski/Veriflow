# Architecture

## System Overview

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
┌───────────────────────────────────────────────────────────────┐
│  ┌────────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐  │
│  │Controllers │  │  Guards  │  │  Services  │  │  Gateway  │  │
│  │ (Routes)   │  │(Auth/Role│  │ (Business  │  │(Socket.io)│  │
│  └────┬───────┘  └──────────┘  │  Logic)    │  └─────┬─────┘  │
│       │                        └─────┬──────┘        │        │
│       └──────────────────────────────┼───────────────┘        │
│                                      │                         │
│                               ┌──────┴──────┐                  │
│                               │   TypeORM   │                  │
│                               │ Repositories│                  │
│                               └──────┬──────┘                  │
│                  Server (NestJS 11)  │  Port 3001              │
└──────────────────────────────────────┼─────────────────────────┘
                                       │
                                ┌──────┴──────┐
                                │ PostgreSQL  │
                                │  Database   │
                                └─────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Client | Next.js 16 (App Router), Tailwind CSS v4, TypeScript |
| Server | NestJS 11, TypeScript |
| Database | PostgreSQL + TypeORM |
| Real-time | Socket.io (NestJS Gateway) |
| Auth | JWT (access + refresh tokens) |
| Validation | class-validator / class-transformer |
| Testing | Jest |
| Object Storage | MinIO (S3-compatible) |
| Test Runner | Playwright (dedicated worker service) |

## Docker Compose Services

```
docker compose up --build
  │
  ├── db (postgres:16-alpine)          Port 5432
  ├── minio (minio/minio:latest)       Ports 9000/9001
  ├── server (NestJS API)              Port 3001
  ├── client (Next.js)                 Port 3000
  └── [runner image — build profile]  Spawned per-run by server
```

> Note: The test worker is not a long-running service. The server spawns an ephemeral container per automation run via Docker (dev) or Kubernetes Jobs (prod). See [Playwright Automation](Playwright-Automation) for details.

## Server Layer Responsibilities

| Layer | Responsibility |
|---|---|
| **Controller** | Parse request, validate DTO, return response. No business logic. |
| **Guard** | Auth verification, role checking. Runs before controller. |
| **Service** | All business logic and orchestration. |
| **Repository** | Data access via TypeORM. Query building, relations, transactions. |
| **Entity** | Database schema definition via TypeORM decorators. |
| **DTO** | Input validation shapes using class-validator. |
| **Gateway** | WebSocket event handling. Delegates to services like controllers do. |

## Module Dependency Graph

```
AppModule
  ├── AuthModule               (standalone — exports JwtStrategy, AuthGuard)
  ├── ProjectsModule           → depends on: AuthModule
  ├── UserStoriesModule        → depends on: AuthModule, ProjectsModule
  ├── ReleasesModule           → depends on: AuthModule, ProjectsModule, UserStoriesModule
  ├── TestExecutionModule      → depends on: AuthModule, ReleasesModule, BugsModule
  ├── BugsModule               → depends on: AuthModule, ProjectsModule, UserStoriesModule
  ├── NotificationsModule      → depends on: AuthModule (standalone)
  ├── ExportModule             → depends on: AuthModule, ReleasesModule, BugsModule
  ├── AttachmentsModule        → depends on: AuthModule, UserStoriesModule, BugsModule
  └── AutomationModule         → depends on: AuthModule, ProjectsModule, UserStoriesModule, ReleasesModule
```

## Client App Router Structure

```
client/app/
  ├── (auth)/                        Public layout
  │     ├── login/page.tsx
  │     └── register/page.tsx
  │
  └── (dashboard)/                   Authenticated layout (sidebar + header)
        ├── layout.tsx
        └── projects/
              ├── page.tsx            Project list
              └── [projectId]/
                    ├── page.tsx      Project overview
                    ├── stories/      Story CRUD
                    ├── releases/     Release + Test Runner
                    ├── bugs/         Bug list + detail
                    ├── automation/   Playwright registry + runs
                    └── settings/     Members, repo config
```

## Security Architecture

```
Client (Bearer header)
  → JwtAuthGuard (verify token)
  → RolesGuard (check role vs @Roles())
  → Controller
```

- **Access tokens**: 15-minute lifetime. Contains `{ userId, email }`.
- **Refresh tokens**: 7-day lifetime. Rotation on every refresh. Invalidated on logout.
- **WebSocket auth**: Token passed on initial connect; gateway middleware validates before allowing connection.
- **Role enforcement**: Server-side only. Client hides UI elements by role, but the server is the authority.
- **Passwords**: bcrypt. Never stored in plaintext.
- **PAT tokens** (for git repo access): AES-256-GCM encrypted at rest.
