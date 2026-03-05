# Getting Started

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Node.js v20.12.2 (for local/manual runs)
- npm (package manager — not yarn or pnpm)

## Docker Compose (Recommended)

Docker Compose runs all services with hot-reload:

```bash
cp .env.example .env
docker compose up --build
```

| Service | URL |
|---|---|
| Client (Next.js) | http://localhost:3000 |
| Server (NestJS API) | http://localhost:3001 |
| PostgreSQL | localhost:5432 |
| MinIO S3 API | http://localhost:9000 |
| MinIO Console | http://localhost:9001 |

Edit source files on the host — both NestJS and Next.js hot-reload automatically.

### Useful Docker commands

```bash
docker compose up -d               # Start in background
docker compose down                # Stop all services
docker compose down -v             # Stop and wipe volumes (resets DB)
docker compose logs -f server      # Tail server logs
```

## Manual Setup

### Server (NestJS — port 3001)

```bash
cd server
npm install
npm run start:dev
```

### Client (Next.js — port 3000)

```bash
cd client
npm install
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values. Key variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `CLIENT_URL` | Allowed CORS origin (e.g., `http://localhost:3000`) |
| `MINIO_ENDPOINT` | MinIO host |
| `MINIO_ACCESS_KEY` | MinIO access key |
| `MINIO_SECRET_KEY` | MinIO secret key |
| `ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM (auth token storage) |
| `WORKER_API_KEY` | Shared secret between server and test worker |
| `SPAWNER_TYPE` | `docker` (default) or `k8s` |
| `RUNNER_IMAGE` | Docker image for spawned test runner containers |
| `DOCKER_SOCKET` | Path to Docker socket (default: `/var/run/docker.sock`) |

## First Run

1. Register an account at `http://localhost:3000/register`.
2. Create a project — you become its `Admin`.
3. Invite team members by email from Project Settings.
4. Create User Stories with Verification Steps.
5. Create a Release, add stories, then close it to freeze the scope.
6. Open the Test Runner and start testing.
