# Test Runner (Test Swarm)

The Test Runner is the real-time collaborative testing interface in Veriflow. Multiple testers can work a release simultaneously with zero double-booking.

## Prerequisites

A release must be in `CLOSED` status before testing can begin. Closing a release freezes its scope — the `ReleaseStory` and `ReleaseStoryStep` snapshot rows become immutable.

## How It Works

```
1. Release is Closed (scope frozen).
2. Testers navigate to the Test Runner for that release.
3. Each tester joins the WebSocket room (release:{releaseId}).
4. Tester emits request-work → server atomically locks an Untested story.
5. Tester executes each Verification Step, marking Pass / Fail / Skip.
6. Tester submits a final verdict.
7. If Fail → a Bug entity is automatically created and linked.
8. Dashboard updates in real-time for all participants.
9. Tester requests the next story and continues.
```

## Tester States

```
idle → (request-work) → executing → (submit-result) → idle
                                                    └── (pool-empty) → done
```

## Story Status Lifecycle

| Status | Meaning |
|---|---|
| `Untested` | Default. In the pool — available for assignment. |
| `In Progress` | Locked by an active tester. |
| `Pass` | All verification steps confirmed. |
| `Fail` | One or more steps failed. A Bug was created. |
| `Partially Tested` | Not all steps could be verified. Re-enters pool. |
| `Can't Be Tested` | Blocked by external dependency. Removed from pool. |

Stories with `Fail` or `Partially Tested` re-enter the pool and can be picked up again.

## Concurrent Assignment

- A story can only be assigned to **one tester at a time**.
- Assignment uses a database transaction with `FOR UPDATE SKIP LOCKED`, making it atomic even under high concurrency.
- Stories are prioritized by `CRITICAL` > `HIGH` > `MEDIUM` > `LOW`, then by creation date.

## Heartbeat & Disconnect

- The client sends a `heartbeat` event every **15 seconds**.
- The server checks for stale sessions every **30 seconds** and drops any tester whose last heartbeat is older than **2 minutes**.
- On drop: the in-progress `TestExecution` row is **hard-deleted** and the story reverts to `Untested`.
- All partial step results are discarded. There is no recovery.

This ensures stories locked by a crashed browser are always returned to the pool.

## Bug Auto-Creation

When a tester submits a `Fail` verdict with bug details:

```
submit-result { status: "FAIL", bug: { title, description, severity } }
  → TestExecution saved (status = FAIL)
  → Bug created (linked to UserStory + TestExecution)
  → Bug status starts as OPEN
  → Assignee is null (PM/Developer assigns later)
```

## Live Dashboard

All testers in the room see real-time updates:

- `status-changed` — any story's test status changes.
- `tester-joined` / `tester-left` — presence tracking.
- `dashboard-update` — aggregated summary (total, pass, fail, untested, inProgress).

## Execution History

Every test attempt is its own `TestExecution` row. The `attempt` counter increments per story per release. You can view the full history of all attempts (including superseded ones) via `GET /releases/:id/executions`.

The release dashboard uses `GET /releases/:id/executions/latest` which returns only the most recent attempt per story.
