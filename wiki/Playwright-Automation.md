# Playwright Automation

Veriflow integrates with external Playwright test suites, linking automated test results to User Stories and release testing.

## Concepts

### Test Registry
Veriflow stores Playwright test **metadata** only (file path, test name, tags). The actual test source code lives in your project's git repository.

The registry is **push-based**: your external project syncs its test catalog to Veriflow via the registry sync API — Veriflow never scans repos directly.

### Story-Test Linking
User Stories and Playwright tests have a **many-to-many** relationship via `StoryTestLink`. A test can cover multiple stories; a story can be verified by multiple tests.

Links are created two ways:
- **Manual** (`USER`): A user selects tests to link from the story detail page.
- **Auto-discovery** (`AUTO_DISCOVERY`): Included in the registry sync payload via `storyExternalIds`.

### Conflict Detection
When a story has both manual `TestExecution` results and `AutomationRun` results, and they disagree (e.g., manual = PASS but automation = FAIL), the system flags a **conflict**. Conflicts are computed at read time — there is no separate conflict entity.

---

## CI/CD Integration

### 1. Register Your Tests (sync the catalog)

Run this from your CI pipeline after `playwright test --list`:

```bash
curl -X POST https://<your-veriflow>/api/v1/projects/<projectId>/automation/registry/sync \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tests": [
      {
        "externalId": "auth-login-001",
        "testFile": "tests/auth/login.spec.ts",
        "testName": "should login with valid credentials",
        "tags": ["auth", "smoke"],
        "storyExternalIds": []
      }
    ]
  }'
```

### 2. Report Results After Each Run

After your Playwright test run completes, push the results:

```bash
curl -X POST https://<your-veriflow>/api/v1/projects/<projectId>/automation/runs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "triggeredBy": "CI_CD",
    "releaseId": "<optional-uuid>",
    "results": [
      {
        "externalId": "auth-login-001",
        "status": "PASS",
        "duration": 1234,
        "startedAt": "2026-03-01T10:00:00Z",
        "completedAt": "2026-03-01T10:00:01Z",
        "externalRunId": "https://github.com/org/repo/actions/runs/123"
      }
    ]
  }'
```

---

## Triggering Runs from the UI

1. Navigate to **Project → Automation**.
2. Select one or more tests from the registry.
3. Click **Run Tests**, enter the target `baseUrl`, optionally select a release.
4. Veriflow spawns an ephemeral test runner container (Docker in dev, Kubernetes Job in prod).
5. The UI polls `GET /automation/runs/:id/status` for progress.

### AutomationRun Status Lifecycle

```
QUEUED → CLONING → INSTALLING → RUNNING → PASS
                                         └→ FAIL
                                         └→ ERROR
                                         └→ TIMEOUT  (exceeded max duration)
                                         └→ CANCELLED (user cancelled)
```

---

## Test Worker Architecture

Each triggered run spawns an **ephemeral container** that:

1. Clones the configured git repository (with SHA-256-keyed cache for repeated runs).
2. Runs `npm ci` to install dependencies.
3. Configures the `baseURL` (public URL or tunnel URL).
4. Executes `npx playwright test --reporter=json` for the target test.
5. Parses JSON reporter output.
6. Reports results back to the Veriflow API via `PATCH /automation/runs/:id/status`.
7. Exits — the container is auto-removed.

### Spawner Types

Set `SPAWNER_TYPE` in your `.env`:

| Value | Description |
|---|---|
| `docker` (default) | Spawns an `AutoRemove` Docker container via the Docker socket. Use in development. |
| `k8s` | Creates a `batch/v1 Job` in Kubernetes. Use in production. |

**Docker dev setup**: The server container mounts the Docker socket (`/var/run/docker.sock`) so it can spawn sibling containers.

**Kubernetes production**: Apply the RBAC manifest in `k8s/runner-rbac.yaml` to give the server pod permission to create Jobs in the `veriflow` namespace.

### Worker Image

The runner container uses `mcr.microsoft.com/playwright` as its base image (Node.js 20 + Playwright + Chromium, Firefox, WebKit pre-installed). Set `RUNNER_IMAGE` in `.env`.

---

## Repo Configuration

Each project can configure a source repository under **Project Settings → Repository**:

| Field | Description |
|---|---|
| Repository URL | Git clone URL (HTTPS or SSH) |
| Branch | Branch to clone (default: `main`) |
| Test Directory | Path to Playwright tests (default: `tests/`) |
| Playwright Config | Path to `playwright.config.ts` (auto-detected if blank) |
| Auth Token | Personal access token or deploy key for private repos (encrypted at rest with AES-256-GCM) |

---

## Tunnel CLI (Local App Testing)

Use the Veriflow CLI to expose a local app so the test worker can reach it:

```bash
npx @veriflow/cli tunnel --port 3000 --project <projectId> --token <apiToken>
```

**How it works:**
1. The CLI authenticates with the Veriflow API using the provided token.
2. A secure WebSocket connection (WSS) is established to the Veriflow tunnel server.
3. Veriflow assigns a unique tunnel URL (e.g., `https://<session>.tunnel.veriflow.local`).
4. Incoming HTTP requests to the tunnel URL are forwarded over the WebSocket to the CLI, which forwards them to `localhost:<port>`.
5. The tunnel stays active as long as the CLI process runs.
6. On disconnect, the tunnel URL is immediately invalidated.

**Security:**
- Tunnel URLs are UUID-based and unguessable.
- Only the Veriflow test worker can route traffic through tunnels.
- Tunnels expire after 2 hours (configurable).
- All traffic is encrypted (WSS).

---

## Conflict Detection

When you view a story's automation summary (`GET /stories/:id/automation/summary`), the API:

1. Fetches all linked tests for the story.
2. Gets the latest `AutomationRun` per test.
3. Gets the latest manual `TestExecution` for the story.
4. Compares the two: if they disagree → `conflict: true`.

The story detail page shows a **conflict indicator** prompting human review. There is no automatic override in either direction.
