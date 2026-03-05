# WebSocket Events

All real-time events flow through the Socket.io namespace `/test-runner`. Clients authenticate via token on connection.

## Connection

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3001/test-runner", {
  auth: { token: "<accessToken>" }
});
```

An invalid or expired token causes the connection to be immediately rejected.

---

## Client → Server (emit)

| Event | Payload | Description |
|---|---|---|
| `join-session` | `{ releaseId: string }` | Join the testing room for a release |
| `leave-session` | `{ releaseId: string }` | Leave the testing room |
| `request-work` | `{ releaseId: string }` | Request the next untested story |
| `update-step` | `{ executionId, stepId, status, comment? }` | Submit a step-level result (PASS / FAIL / SKIPPED) |
| `submit-result` | `{ executionId, status, comment?, bug?: { title, description, severity } }` | Final verdict. If `FAIL` with `bug`, a Bug is auto-created. |
| `heartbeat` | `{ releaseId: string }` | Keep-alive ping (send every 15 seconds) |

---

## Server → Client (on)

| Event | Payload | Description |
|---|---|---|
| `story-assigned` | `{ executionId, releaseStory: { id, title, description, steps[] } }` | Story locked and assigned to this tester |
| `pool-empty` | `{ releaseId: string }` | No untested stories remain in this release |
| `error` | `{ message: string }` | Something went wrong on the server |

---

## Server → Room (broadcast to all testers in the release)

| Event | Payload | Description |
|---|---|---|
| `status-changed` | `{ releaseStoryId, status, testerName, attempt }` | A story's test status changed |
| `tester-joined` | `{ userId, name }` | A new tester entered the session |
| `tester-left` | `{ userId, name, unlockedStoryId? }` | Tester left or disconnected. If they had a story assigned, it reverts to `Untested`. |
| `dashboard-update` | `{ summary: { total, pass, fail, untested, inProgress } }` | Aggregated stats refresh |

---

## Notifications Namespace

Real-time in-app notifications are delivered via a separate Socket.io namespace.

```javascript
const notifSocket = io("http://localhost:3001/notifications", {
  auth: { token: "<accessToken>" }
});

notifSocket.on("notification", (data) => {
  // data: { id, type, message, read, createdAt, ... }
});
```

---

## Heartbeat & Disconnect Handling

```
Client                          Server
  │                               │
  ├── heartbeat (every 15s) ─────►│── Update lastSeen for this tester
  │                               │
  ✕  (client crashes)             │
  │                               │── Interval checks lastSeen every 30s
  │                               │── If now - lastSeen > 2 minutes:
  │                               │     Hard-delete the in-progress TestExecution
  │                               │     Unlock assigned story (reverts to Untested)
  │                               │     Emit tester-left to room
  │                               │     Emit dashboard-update to room
```

**Important**: Disconnects discard **all** partial work. Step results saved so far are deleted along with the in-progress execution row. There is no recovery mechanism — the story re-enters the pool for another tester.

---

## Server-Side Session State

The gateway maintains an in-memory map per connected socket:

```typescript
Map<socketId, {
  userId: string;
  releaseId: string;
  assignedExecutionId: string | null;
  lastSeen: Date;
}>
```

This is ephemeral — a server restart drops all sessions and testers must reconnect. Persistent state (execution records, step results) is always in PostgreSQL.

---

## Story Assignment Algorithm

When a tester emits `request-work`:

1. `BEGIN TRANSACTION`
2. Select a `ReleaseStory` from the release where no `TestExecution` with status `IN_PROGRESS` or `PASS` exists.
3. Stories are ordered by priority descending (`CRITICAL` first), then by `createdAt` ascending.
4. `FOR UPDATE SKIP LOCKED` prevents two concurrent requests from grabbing the same story.
5. Insert a new `TestExecution` row (`status = IN_PROGRESS`).
6. `COMMIT`
7. Emit `story-assigned` to the requesting tester.
8. Emit `status-changed` + `dashboard-update` to the room.

Stories with `FAIL` or `PARTIALLY_TESTED` status re-enter the pool and can be picked up again.
