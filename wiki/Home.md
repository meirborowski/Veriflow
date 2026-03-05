# Veriflow Wiki

Veriflow is an integrated platform for managing the software development lifecycle, bridging Requirements and Testing. The core philosophy: **"The Requirement IS the Test Case"** — every User Story doubles as its test script.

## Quick Links

- [Getting Started](Getting-Started)
- [Architecture](Architecture)
- [Data Model](Data-Model)
- [API Reference](API-Reference)
- [WebSocket Events](WebSocket-Events)
- [User Roles & Permissions](Roles-and-Permissions)
- [Test Runner (Test Swarm)](Test-Runner)
- [Playwright Automation](Playwright-Automation)
- [Development Guide](Development-Guide)

## What is Veriflow?

Veriflow replaces spreadsheet-based QA tracking with a real-time collaborative platform. Key capabilities:

- **Project & Team Management** — Create projects, add members, assign roles.
- **Requirements as Test Cases** — User Stories contain ordered Verification Steps that testers execute directly.
- **Release Snapshots** — Releases freeze a scope of stories. Edits to master stories never affect in-progress testing.
- **Real-Time Test Swarm** — Multiple testers work concurrently with zero double-booking. Stories are atomically assigned, heartbeats detect disconnects, and partial work is automatically discarded.
- **Defect Tracking** — A `Fail` verdict auto-creates a Bug entity linked to the story and the specific execution attempt.
- **Playwright Automation** — Connect external test suites, auto-link tests to stories, trigger runs from the UI, and detect conflicts when manual and automated results disagree.

## Project Status

| Phase | Description | Status |
|---|---|---|
| Phase 1 | Foundation — Auth, Projects, User Stories | Complete |
| Phase 2 | Release Engine — Snapshot freeze | Complete |
| Phase 3 | Test Runner — Real-time WebSocket swarm | Complete |
| Phase 4 | Defect Tracking — Bug lifecycle | Complete |
| Phase 5 | Polish — Search, export, attachments, notifications | Complete |
| Phase 6 | Playwright Automation Integration | In Progress |
