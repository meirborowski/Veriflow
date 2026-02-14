# Veriflow

Veriflow is an integrated platform for managing the software development lifecycle, specifically designed to bridge the gap between Requirements and Testing.

## Core Philosophy
In Veriflow, a **User Story** acts as both the FEATURE REQUIREMENT and the TEST CASE. This ensures that every requirement is verifiable and directly linked to testing execution.

## Key Features & Workflow

### 1. Project & Team Management
- Create projects and add team members.
- Assign roles to members (users can participate in multiple projects).

### 2. Requirements Engineering
- Create User Stories that double as Test Cases.
- Define specific "Steps to Verify" for each story.

### 3. Release Management
- **Draft Phase**: Create a release and scope it by adding User Stories.
- **Freeze Phase**: Transition the release to a **Closed** state. This makes the release immutable—no further changes to scope are allowed.

### 4. Integrated Testing
- **Execution**: Start testing a Closed release.
- **Status Tracking**: Mark stories as `Pass`, `Fail`, `Partially Tested`, or `Can't be Tested`.
- **Real-Time Collaboration**: Multiple users can test simultaneously. The system dynamically assigns unverified stories to testers in real-time to prevent duplication of effort.

## Getting Started

### Client (Next.js)
```bash
cd client
npm run dev
```

### Server (NestJS)
```bash
cd server
npm run start:dev
```
