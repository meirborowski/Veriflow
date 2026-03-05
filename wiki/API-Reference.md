# API Reference

## Conventions

- **Base URL**: `/api/v1`
- **Auth**: `Authorization: Bearer <accessToken>` on all routes except the auth endpoints below.
- **Content-Type**: `application/json`
- **IDs**: UUID v4
- **Timestamps**: ISO 8601
- **Pagination**: `?page=1&limit=20` → `{ data, meta: { total, page, limit, totalPages } }`
- **Errors**: `{ statusCode, message, error }`

---

## Auth

### `POST /auth/register`
```json
// Request
{ "email": "user@example.com", "password": "securePass1!", "name": "Jane Doe" }
// Response 201
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

### `POST /auth/login`
```json
// Request
{ "email": "user@example.com", "password": "securePass1!" }
// Response 200
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

### `POST /auth/refresh`
```json
// Request
{ "refreshToken": "eyJ..." }
// Response 200
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

### `GET /auth/me`
```json
// Response 200
{ "id": "uuid", "email": "user@example.com", "name": "Jane Doe", "createdAt": "..." }
```

---

## Projects

### `POST /projects`
Any authenticated user. Creator becomes `Admin`.
```json
// Request
{ "name": "Project Alpha", "description": "Main product release tracking" }
// Response 201
{ "id": "uuid", "name": "Project Alpha", "description": "...", "createdAt": "..." }
```

### `GET /projects`
Returns projects the authenticated user is a member of. Supports `?search=&orderBy=&sortDir=&page=&limit=`.
```json
// Response 200
{
  "data": [{ "id": "uuid", "name": "Project Alpha", "role": "ADMIN", "createdAt": "..." }],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```

### `GET /projects/:id`
```json
// Response 200
{ "id": "uuid", "name": "Project Alpha", "members": [{ "userId": "uuid", "name": "Jane", "role": "ADMIN" }] }
```

### `PATCH /projects/:id`
**Roles**: `Admin`

### `DELETE /projects/:id`
**Roles**: `Admin`

### `POST /projects/:id/members`
**Roles**: `Admin`
```json
// Request
{ "email": "dev@example.com", "role": "DEVELOPER" }
// Response 201
{ "userId": "uuid", "projectId": "uuid", "role": "DEVELOPER" }
```

### `PATCH /projects/:id/members/:userId`
**Roles**: `Admin`
```json
// Request
{ "role": "TESTER" }
```

### `DELETE /projects/:id/members/:userId`
**Roles**: `Admin` — Response 204

---

## User Stories

### `POST /projects/:projectId/stories`
**Roles**: `Admin`, `PM`, `Developer`
```json
// Request
{
  "title": "Login Page",
  "description": "User can log in with email and password",
  "priority": "HIGH",
  "steps": [
    { "order": 1, "instruction": "Navigate to /login" },
    { "order": 2, "instruction": "Enter valid credentials and click Login" },
    { "order": 3, "instruction": "Verify dashboard loads" }
  ]
}
```

### `GET /projects/:projectId/stories`
Supports `?status=ACTIVE&priority=HIGH&search=login&page=1&limit=20&orderBy=&sortDir=`.

### `GET /stories/:id`

### `PATCH /stories/:id`
**Roles**: `Admin`, `PM`, `Developer`. Steps without an `id` are created; existing steps omitted from the array are deleted.

### `DELETE /stories/:id`
**Roles**: `Admin`, `PM` — Response 204

---

## Releases

### `POST /projects/:projectId/releases`
**Roles**: `Admin`, `PM`
```json
// Request
{ "name": "v1.0" }
// Response 201
{ "id": "uuid", "name": "v1.0", "status": "DRAFT", "createdAt": "..." }
```

### `GET /projects/:projectId/releases`
Supports `?status=DRAFT&search=&page=&limit=`.

### `GET /releases/:id`
Returns full release with snapshot stories, steps, and latest execution per story.

### `PATCH /releases/:id`
**Roles**: `Admin`, `PM`

### `DELETE /releases/:id`
**Roles**: `Admin`, `PM` — Response 204

### `POST /releases/:id/stories`
**Roles**: `Admin`, `PM`. Requires `DRAFT` status.
```json
// Request
{ "storyIds": ["uuid-1", "uuid-2"] }
// Response 201
{ "added": 2 }
```

### `DELETE /releases/:id/stories/:storyId`
**Roles**: `Admin`, `PM`. Requires `DRAFT` status — Response 204

### `POST /releases/:id/close`
**Roles**: `Admin`, `PM`. Requires `DRAFT` status + at least 1 story. **Irreversible.**

Freezes the release: creates `ReleaseStory` + `ReleaseStoryStep` snapshots.
```json
// Response 200
{ "id": "uuid", "name": "v1.0", "status": "CLOSED", "closedAt": "...", "storyCount": 5 }
```

---

## Test Execution

### `GET /releases/:id/executions`
Returns all execution history for the release. Supports `?storyId=uuid&status=FAIL&page=&limit=`.

### `GET /releases/:id/executions/latest`
Returns the latest execution per story — used for the release dashboard.
```json
// Response 200
{
  "summary": { "total": 10, "pass": 4, "fail": 2, "untested": 3, "inProgress": 1 },
  "stories": [{ "releaseStoryId": "uuid", "title": "Login Page", "status": "FAIL", "attempt": 2 }]
}
```

### `GET /executions/:id`
Full detail including step-level results.

---

## Bugs

### `POST /bugs`
**Roles**: All. Auto-created on `Fail` verdict; also available manually.
```json
// Request
{
  "projectId": "uuid",
  "storyId": "uuid",
  "executionId": "uuid",
  "title": "Login button unresponsive",
  "description": "Expected: dashboard loads. Actual: nothing happens on click.",
  "severity": "MAJOR"
}
```

### `GET /projects/:projectId/bugs`
Supports `?status=OPEN&severity=MAJOR&storyId=uuid&search=&orderBy=&sortDir=&page=&limit=`.

### `GET /bugs/:id`

### `PATCH /bugs/:id`
**Roles**: `Admin`, `PM`, `Developer`
```json
// Request
{ "status": "IN_PROGRESS", "assignedToId": "uuid", "severity": "CRITICAL" }
```

### `DELETE /bugs/:id`
**Roles**: `Admin` — Response 204

---

## Attachments

### `POST /attachments/entity/:entityType/:entityId`
**Roles**: `Admin`, `PM`, `Developer`. Multipart form-data. Max 10 MB. Allowed types: images, PDFs, common documents.

### `GET /attachments/entity/:entityType/:entityId`
List attachments for a story or bug.

### `GET /attachments/:id/download`
Returns a signed download URL.

### `DELETE /attachments/:id`
**Roles**: `Admin`, `PM`, `Developer` — Response 204

---

## Export

### `GET /releases/:id/export?format=csv|pdf`
**Roles**: `Admin`, `PM`, `Developer`, `Tester`. Downloads a release report.

### `GET /projects/:projectId/bugs/export?format=csv|pdf`
**Roles**: `Admin`, `PM`, `Developer`, `Tester`. Downloads a bug report. Supports same filters as the bugs list.

---

## Notifications

### `GET /notifications`
Returns the authenticated user's notifications (paginated, newest first).

### `PATCH /notifications/:id/read`
Mark a notification as read — Response 200

### `PATCH /notifications/read-all`
Mark all notifications as read — Response 200

---

## Playwright Automation

### `POST /projects/:projectId/automation/registry/sync`
**Roles**: `Admin`, `PM`, `Developer`. Push test catalog from external project.
```json
// Request
{
  "tests": [{
    "externalId": "auth-login-001",
    "testFile": "tests/auth/login.spec.ts",
    "testName": "should login with valid credentials",
    "tags": ["auth", "smoke"],
    "storyExternalIds": ["story-uuid-1"]
  }]
}
// Response 200
{ "created": 3, "updated": 1, "linked": 2 }
```

### `GET /projects/:projectId/automation/tests`
Supports `?search=&tags=&linked=true&page=&limit=`.

### `GET /automation/tests/:id`

### `DELETE /automation/tests/:id`
**Roles**: `Admin`, `PM` — Response 204

### `POST /stories/:storyId/automation/link`
**Roles**: `Admin`, `PM`, `Developer`. Manually link tests to a story.
```json
// Request
{ "testIds": ["uuid-1", "uuid-2"] }
// Response 201
{ "linked": 2 }
```

### `DELETE /stories/:storyId/automation/link/:testId`
**Roles**: `Admin`, `PM`, `Developer` — Response 204

### `GET /stories/:storyId/automation/summary`
Returns automation status summary + conflict detection for a story.
```json
// Response 200
{
  "linkedTests": 3,
  "latestResults": { "pass": 2, "fail": 1, "error": 0, "skipped": 0 },
  "conflict": true,
  "conflictDetail": {
    "manualStatus": "PASS",
    "automationStatus": "FAIL",
    "failedTests": [{ "id": "uuid", "testName": "should reject invalid password" }]
  }
}
```

### `POST /projects/:projectId/automation/trigger`
**Roles**: `Admin`, `PM`, `Developer`. Trigger Playwright runs from the UI.
```json
// Request
{ "testIds": ["uuid-1", "uuid-2"], "baseUrl": "https://staging.example.com", "releaseId": "uuid" }
// Response 202
{ "batchId": "uuid", "runs": [{ "id": "uuid", "testId": "uuid-1", "status": "QUEUED" }] }
```

### `POST /projects/:projectId/automation/runs`
**Roles**: `Admin`, `PM`, `Developer`. Report results from CI/CD pipeline.
```json
// Request
{
  "triggeredBy": "CI_CD",
  "releaseId": "uuid",
  "results": [{
    "externalId": "auth-login-001",
    "status": "PASS",
    "duration": 1234,
    "startedAt": "...",
    "completedAt": "..."
  }]
}
// Response 201
{ "recorded": 2, "releaseId": "uuid" }
```

### `GET /projects/:projectId/automation/runs`
Supports `?testId=uuid&releaseId=uuid&status=FAIL&page=&limit=`.

### `GET /automation/runs/:id`

### `GET /automation/runs/:id/status`
Poll for run progress.

### `GET /projects/:projectId/automation/repo-config`
**Roles**: All.

### `PUT /projects/:projectId/automation/repo-config`
**Roles**: `Admin`, `PM`.

### `POST /projects/:projectId/automation/tunnel`
**Roles**: `Admin`, `PM`, `Developer`. Register a tunnel for local app testing.
```json
// Request
{ "localPort": 3000 }
// Response 201
{ "tunnelId": "uuid", "tunnelUrl": "https://abc123.tunnel.veriflow.local", "expiresAt": "..." }
```

### `DELETE /automation/tunnel/:tunnelId`
— Response 204

---

## Error Responses

```json
// 400
{ "statusCode": 400, "message": "Validation failed", "errors": [{ "field": "email", "message": "must be a valid email" }] }
// 401
{ "statusCode": 401, "message": "Invalid or expired token" }
// 403
{ "statusCode": 403, "message": "Insufficient permissions" }
// 404
{ "statusCode": 404, "message": "Story not found" }
// 409
{ "statusCode": 409, "message": "Release is already closed" }
```
