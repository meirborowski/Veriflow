# Roles and Permissions

## Roles

Users are assigned a single role per project. A user can have different roles across different projects.

| Role | Description |
|---|---|
| `Admin` | Full control over the project — members, stories, releases, bugs. |
| `PM` | Manages stories and releases. Cannot manage members or delete the project. |
| `Developer` | Creates and edits stories. Can execute tests and manage bugs. |
| `Tester` | Executes tests and views results. Read-only on most entities. |

## General Permissions

| Action | Admin | PM | Developer | Tester |
|---|---|---|---|---|
| Create/edit/delete project | Yes | No | No | No |
| Manage members (invite, role, remove) | Yes | No | No | No |
| Create/edit stories | Yes | Yes | Yes | No |
| Delete stories | Yes | Yes | No | No |
| Create/edit releases | Yes | Yes | No | No |
| Close release | Yes | Yes | No | No |
| Execute tests (Test Runner) | Yes | Yes | Yes | Yes |
| Create bugs manually | Yes | Yes | Yes | Yes |
| Update/assign bugs | Yes | Yes | Yes | No |
| Delete bugs | Yes | No | No | No |
| Export reports | Yes | Yes | Yes | Yes |
| Upload/delete attachments | Yes | Yes | Yes | No |

## Automation Permissions

| Action | Admin | PM | Developer | Tester |
|---|---|---|---|---|
| Sync test registry | Yes | Yes | Yes | No |
| Link/unlink tests to stories | Yes | Yes | Yes | No |
| Report automation results (CI/CD) | Yes | Yes | Yes | No |
| View automation results | Yes | Yes | Yes | Yes |
| Delete tests from registry | Yes | Yes | No | No |
| Trigger runs from UI | Yes | Yes | Yes | No |
| Configure repo settings | Yes | Yes | No | No |
| Create/delete tunnel | Yes | Yes | Yes | No |

## How Role Enforcement Works

1. All role checks happen **server-side** via `RolesGuard` + the `@Roles()` decorator.
2. The client hides UI elements based on the user's role, but this is cosmetic. The server is the authority.
3. `RolesGuard` resolves the project from the request context (route param, or by looking up the relevant entity), then checks the user's `ProjectMember.role` against the required roles.
4. Insufficient role → `403 Forbidden`.
5. Not a member of the project → `403 Forbidden`.

## Project Membership Rules

- The creator of a project is automatically assigned the `Admin` role.
- A project must always have at least one `Admin`. Demoting the last admin is blocked with a `400 Bad Request`.
- Members are added by email. If the email does not correspond to an existing Veriflow account, the invite is rejected.
