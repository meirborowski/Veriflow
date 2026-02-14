# Veriflow Project Guide

For a high-level overview of the project and its core philosophy, see [README.md](README.md).

## Project Scope & Domain Logic
**Purpose**: Integrated platform for managing software development from requirements to testing.

### core Workflows
1.  **Project & Team**:
    - Users can be members of multiple projects with different roles.
2.  **Requirements (User Stories)**:
    - A User Story acts as both the FEATURE REQUIREMENT and the TEST CASE.
    - Must include "Steps to Verify".
3.  **Release Management**:
    - **Draft State**: Stories can be added/removed.
    - **Closed State**: Release is immutable. Scope is frozen. Testing can begin.
4.  **Testing Execution**:
    - **Concurrency**: Multiple users test a release simultaneously.
    - **Assignment**: Real-time distribution of stories to testers (no double-booking).
    - **Statuses**: `Pass`, `Fail`, `Partially Tested`, `Can't be Tested`.

## Project Structure
- `client/`: Next.js 16 frontend application
- `server/`: NestJS 11 backend application

## Commands

### Client (Next.js)
- **Dev Server**: `cd client && npm run dev`
- **Build**: `cd client && npm run build`
- **Start Production**: `cd client && npm run start`
- **Lint**: `cd client && npm run lint`

### Server (NestJS)
- **Dev Server**: `cd server && npm run start:dev`
- **Build**: `cd server && npm run build`
- **Test**: `cd server && npm run test`
- **E2E Test**: `cd server && npm run test:e2e`
- **Format**: `cd server && npm run format`
- **Lint**: `cd server && npm run lint`

## Tech Stack & Guidelines

### Client
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **State Management**: React Context / Hooks (default)

### Server
- **Framework**: NestJS 11
- **Language**: TypeScript
- **Testing**: Jest
- **Validation**: class-validator / class-transformer (recommended)

### General Guidelines
- **Package Manager**: npm
- **Naming Conventions**: 
  - Utilities/Functions: camelCase
  - Components: PascalCase
  - Files: kebab-case (especially in NestJS)
  - Interfaces: PascalCase (prefix with `I` is discouraged in TS, use descriptive names)
- **Error Handling**: Use try/catch blocks and proper HTTP error codes.
