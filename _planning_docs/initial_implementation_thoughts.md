# Development Orchestrator - Implementation Plan

## Overview

This document provides a systematic checklist for building the Development Orchestrator. The architecture separates concerns:

- **Local Desktop App** (`/local-app`) - Electron app for process management, git operations, Claude Code launching
- **Web Interface** (`/web-app`) - Future React web app for project/journey management, accessible from anywhere
- **Shared** (`/shared`) - Common types, utilities, and potentially a shared API client

---

## Architecture Overview

```
dev_orchestrator/
├── _planning_docs/              # Planning documentation
├── local-app/                   # Electron desktop application
│   ├── electron/                # Main process
│   ├── src/                     # Renderer (React)
│   └── package.json
├── web-app/                     # Future: Web interface (Next.js/React)
│   ├── src/
│   └── package.json
├── shared/                      # Shared types and utilities
│   ├── types/
│   └── package.json
└── README.md
```

### Separation of Concerns

| Capability | Local App | Web App |
|------------|-----------|---------|
| View projects & journeys | Yes | Yes |
| Create/edit projects & journeys | Yes (local DB) | Yes (Supabase) |
| Git worktree operations | Yes | No (triggers local app) |
| Launch Claude Code | Yes | No (triggers local app) |
| Start/stop dev servers | Yes | No (triggers local app) |
| Process monitoring | Yes | View status only |
| Works offline | Yes | No |
| Multi-device access | No | Yes |

Eventually: Web app sends commands to local app via WebSocket/local API for machine-specific operations.

---

## Tech Stack

### Local Desktop App (`/local-app`)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Desktop Shell | Electron | Cross-platform, native system access |
| Frontend | React + TypeScript | Modern, type-safe UI development |
| Styling | Tailwind CSS | Rapid UI development |
| State Management | Zustand | Lightweight, simple |
| IPC Layer | Electron IPC | Main ↔ Renderer communication |
| Local Storage | SQLite (better-sqlite3) | Structured data, offline-first |
| Build Tool | Vite + electron-vite | Fast HMR |

### Web App (`/web-app`) - Future

| Layer | Technology |
|-------|------------|
| Framework | Next.js |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth |
| Styling | Tailwind CSS |

---

## Local App Structure (`/local-app`)

```
local-app/
├── electron/                    # Electron main process
│   ├── main.ts                  # Entry point
│   ├── preload.ts               # Secure bridge to renderer
│   ├── ipc/                     # IPC handlers
│   │   ├── projects.ts
│   │   ├── journeys.ts
│   │   ├── worktrees.ts
│   │   ├── processes.ts
│   │   └── claude.ts
│   ├── services/                # Business logic
│   │   ├── git.service.ts       # Git/worktree operations
│   │   ├── process.service.ts   # Server management
│   │   ├── port.service.ts      # Port allocation
│   │   └── claude.service.ts    # Claude Code launcher
│   └── database/
│       ├── schema.sql
│       ├── migrations/
│       └── db.ts
├── src/                         # React renderer
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── projects/
│   │   │   ├── ProjectList.tsx
│   │   │   └── ProjectCard.tsx
│   │   ├── journeys/
│   │   │   ├── JourneyBoard.tsx
│   │   │   ├── JourneyCard.tsx
│   │   │   └── JourneyActions.tsx
│   │   └── common/
│   │       ├── StatusBadge.tsx
│   │       └── Button.tsx
│   ├── stores/
│   │   ├── projectStore.ts
│   │   └── journeyStore.ts
│   ├── hooks/
│   │   └── useElectron.ts
│   └── types/
│       └── index.ts
├── package.json
├── electron.vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## Implementation Phases & Checklists

### Phase 0: Repository Setup

**Goal**: Set up monorepo structure

- [ ] Create folder structure:
  ```bash
  mkdir -p local-app web-app shared
  ```

- [ ] Initialize root package.json (optional - for workspace management)
  ```json
  {
    "name": "dev-orchestrator",
    "private": true,
    "workspaces": ["local-app", "web-app", "shared"]
  }
  ```

- [ ] Update .gitignore for all sub-projects

**Validation**: Clean folder structure ready for development

---

### Phase 1: Local App Scaffolding

**Goal**: Get a working Electron + React app running

- [ ] Navigate to local-app folder
  ```bash
  cd local-app
  ```

- [ ] Initialize npm project
  ```bash
  npm init -y
  ```

- [ ] Install core dependencies
  ```bash
  npm install electron react react-dom
  npm install -D electron-vite vite typescript
  npm install -D @types/react @types/react-dom @types/node
  npm install -D tailwindcss postcss autoprefixer
  ```

- [ ] Create `electron.vite.config.ts`
- [ ] Create `tsconfig.json` (with paths for electron/ and src/)
- [ ] Create `tailwind.config.js` and `postcss.config.js`
- [ ] Initialize Tailwind: `npx tailwindcss init -p`
- [ ] Set up folder structure (electron/, src/)
- [ ] Create `electron/main.ts` with basic window creation
- [ ] Create `electron/preload.ts` with contextBridge setup
- [ ] Create `src/main.tsx` React entry point
- [ ] Create `src/App.tsx` with "Hello Orchestrator"
- [ ] Create `src/index.css` with Tailwind directives
- [ ] Add npm scripts to `package.json`:
  ```json
  {
    "scripts": {
      "dev": "electron-vite dev",
      "build": "electron-vite build",
      "preview": "electron-vite preview"
    }
  }
  ```

**Validation**: Run `npm run dev` and see Electron window with React content

---

### Phase 2: Database & Data Layer

**Goal**: Persistent local storage for projects and journeys

- [ ] Install SQLite dependencies
  ```bash
  npm install better-sqlite3
  npm install -D @types/better-sqlite3
  ```

- [ ] Create database schema (`electron/database/schema.sql`):
  ```sql
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    root_path TEXT NOT NULL UNIQUE,
    frontend_path TEXT,           -- relative path to frontend
    backend_path TEXT,            -- relative path to backend
    frontend_start_cmd TEXT DEFAULT 'npm run dev',
    backend_start_cmd TEXT DEFAULT 'rails s',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS journeys (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    branch_name TEXT NOT NULL,
    worktree_path TEXT,
    status TEXT DEFAULT 'planning',
    rails_port INTEGER,
    react_port INTEGER,
    rails_pid INTEGER,
    react_pid INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE INDEX idx_journeys_project ON journeys(project_id);
  CREATE INDEX idx_journeys_status ON journeys(status);
  ```

- [ ] Create `electron/database/db.ts` - database initialization & helpers
- [ ] Create IPC handlers for CRUD operations:
  - `electron/ipc/projects.ts` - project CRUD
  - `electron/ipc/journeys.ts` - journey CRUD
- [ ] Register IPC handlers in `main.ts`
- [ ] Expose IPC methods via `preload.ts`
- [ ] Create `src/hooks/useElectron.ts` for typed IPC calls

**Validation**: Can create/read/update/delete projects and journeys via DevTools console

---

### Phase 3: Basic UI Shell

**Goal**: Navigation and layout working

- [ ] Install UI dependencies
  ```bash
  npm install zustand uuid
  npm install -D @types/uuid
  ```

- [ ] Create type definitions (`src/types/index.ts`):
  ```typescript
  export type JourneyStatus = 'planning' | 'in_progress' | 'ready' | 'deployed';
  export type ServerStatus = 'stopped' | 'starting' | 'running' | 'error';

  export interface Project {
    id: string;
    name: string;
    rootPath: string;
    frontendPath?: string;
    backendPath?: string;
    frontendStartCmd: string;
    backendStartCmd: string;
    createdAt: string;
  }

  export interface Journey {
    id: string;
    projectId: string;
    name: string;
    description?: string;
    branchName: string;
    worktreePath?: string;
    status: JourneyStatus;
    railsPort?: number;
    reactPort?: number;
    railsPid?: number;
    reactPid?: number;
    createdAt: string;
  }
  ```

- [ ] Create Zustand stores:
  - `src/stores/projectStore.ts` - projects state + actions
  - `src/stores/journeyStore.ts` - journeys state + actions
  - `src/stores/uiStore.ts` - selected project, UI state

- [ ] Create layout components:
  - `Sidebar.tsx` - project list navigation
  - `Header.tsx` - current project name, global actions
  - `MainLayout.tsx` - combines sidebar + content area

- [ ] Create project components:
  - `ProjectList.tsx` - list all projects in sidebar
  - `ProjectCard.tsx` - single project item
  - `AddProjectModal.tsx` - folder picker + project setup

- [ ] Create journey components:
  - `JourneyBoard.tsx` - kanban-style columns by status
  - `JourneyCard.tsx` - single journey card with actions
  - `StatusBadge.tsx` - colored status indicator
  - `AddJourneyModal.tsx` - create journey form

- [ ] Create common components:
  - `Button.tsx` - styled button variants
  - `Modal.tsx` - modal wrapper
  - `Input.tsx` - styled input

- [ ] Style with Tailwind (dark theme for dev tool aesthetic)

**Validation**: Can view projects in sidebar, see journey board, UI is navigable

---

### Phase 4: Git Worktree Integration

**Goal**: Create and manage git worktrees for journeys

- [ ] Install git library
  ```bash
  npm install simple-git
  ```

- [ ] Create `electron/services/git.service.ts`:
  ```typescript
  // Key functions:
  - isGitRepo(path: string): Promise<boolean>
  - getDefaultBranch(repoPath: string): Promise<string>
  - createWorktree(repoPath, branchName, worktreePath): Promise<void>
  - removeWorktree(repoPath, worktreePath): Promise<void>
  - listWorktrees(repoPath): Promise<Worktree[]>
  - getCurrentBranch(worktreePath): Promise<string>
  - getStatus(worktreePath): Promise<GitStatus>
  - pushBranch(worktreePath): Promise<void>
  ```

- [ ] Create `electron/ipc/worktrees.ts` IPC handlers
- [ ] Expose worktree methods in preload.ts

- [ ] Update Journey creation flow:
  - Auto-generate branch name from journey name (slugify)
  - Create worktree in `{repoPath}/worktrees/{journey-slug}/`
  - Store worktree path in database

- [ ] Add UI elements:
  - Git status indicator on journey card
  - Branch name display
  - "Push Branch" action button

- [ ] Handle journey deletion:
  - Confirm dialog
  - Remove worktree
  - Delete from database

**Validation**: Creating journey creates worktree, deleting cleans up

---

### Phase 5: Claude Code Integration

**Goal**: Launch Claude Code in correct worktree context

- [ ] Research Claude Code CLI/launch options:
  - macOS: Check for `claude` CLI or app bundle
  - Fallback: Open folder in VS Code if Claude not found

- [ ] Create `electron/services/claude.service.ts`:
  ```typescript
  - detectClaudeInstallation(): Promise<ClaudeInstallInfo>
  - launchClaude(workingDirectory: string): Promise<void>
  - isClaudeRunning(directory: string): Promise<boolean>
  ```

- [ ] Create `electron/ipc/claude.ts` IPC handler

- [ ] Add "Open in Claude Code" button to JourneyCard
  - Primary action button
  - Shows error toast if Claude not found

- [ ] Add fallback option:
  - "Open in VS Code" as alternative
  - "Open in Finder/Terminal"

**Validation**: Clicking "Open in Claude Code" opens correct worktree

---

### Phase 6: Process Management

**Goal**: Start/stop/monitor Rails and React dev servers

- [ ] Create `electron/services/port.service.ts`:
  ```typescript
  // Port ranges
  const RAILS_PORT_START = 4001;
  const RAILS_PORT_END = 4020;
  const REACT_PORT_START = 4201;
  const REACT_PORT_END = 4220;

  - isPortAvailable(port: number): Promise<boolean>
  - getNextAvailablePort(type: 'rails' | 'react'): Promise<number>
  - reservePort(journeyId: string, port: number): void
  - releasePort(journeyId: string): void
  ```

- [ ] Create `electron/services/process.service.ts`:
  ```typescript
  interface ManagedProcess {
    pid: number;
    journeyId: string;
    type: 'rails' | 'react';
    port: number;
    status: ServerStatus;
  }

  - startServer(journeyId, type, workingDir, command, port): Promise<ManagedProcess>
  - stopServer(journeyId, type): Promise<void>
  - stopAllServers(journeyId): Promise<void>
  - getServerStatus(journeyId, type): ServerStatus
  - getAllRunningProcesses(): ManagedProcess[]
  - cleanupOnExit(): void  // Kill all on app quit
  ```

- [ ] Create `electron/ipc/processes.ts` IPC handlers

- [ ] Handle process lifecycle:
  - Track spawned processes in memory
  - Update database with PIDs
  - Clean up on app quit (beforeunload)
  - Handle process crashes (restart option)

- [ ] Update UI:
  - Server status dots on journey card (red/yellow/green)
  - "Start Servers" / "Stop Servers" buttons
  - "Open in Browser" button (opens localhost:port)
  - Individual server controls (start/stop Rails, start/stop React)

- [ ] Add process output viewer (optional):
  - Expandable console panel
  - Stream stdout/stderr
  - Clear logs button

**Validation**: Can start/stop servers, see status, open in browser

---

### Phase 7: Actions & Workflow Polish

**Goal**: Complete journey lifecycle

- [ ] Implement journey actions:
  - "Mark as In Progress" - status change
  - "Mark as Ready" - status change
  - "Push Branch" - git push with feedback
  - "Create PR" - opens GitHub PR URL in browser
  - "Open in Browser" - opens localhost with correct ports

- [ ] Add context menu to journey cards:
  - Right-click for full action list
  - Quick actions visible on card

- [ ] Implement status transitions:
  ```
  Planning → In Progress → Ready → Deployed
  (with ability to move backwards)
  ```

- [ ] Add keyboard shortcuts:
  - `Cmd+N` - New journey
  - `Cmd+O` - Open selected in Claude Code
  - `Cmd+Shift+S` - Start servers for selected
  - `Cmd+Shift+X` - Stop servers for selected

- [ ] Add project settings:
  - Edit frontend/backend paths
  - Edit start commands
  - Delete project (with confirmation)

**Validation**: Full journey lifecycle from create to "deployed" status

---

### Phase 8: Polish & Error Handling

**Goal**: Production-quality local app

- [ ] Add project setup wizard:
  - Step 1: Select folder (must be git repo)
  - Step 2: Detect/configure frontend path
  - Step 3: Detect/configure backend path
  - Step 4: Test start commands

- [ ] Add settings/preferences:
  - Port range configuration
  - Default branch to branch from (main/staging)
  - Theme toggle (dark/light)
  - Claude Code path override

- [ ] Implement search/filter:
  - Filter journeys by status
  - Search by journey name
  - Sort options (date, name, status)

- [ ] Add notifications:
  - Server started/stopped
  - Server crashed
  - Git operation failed

- [ ] Error handling:
  - Git operation failures (nice error messages)
  - Port conflicts (suggest alternatives)
  - Process spawn failures
  - Database errors

- [ ] Add app menu (macOS menu bar):
  - File > New Project, New Journey
  - Edit > standard edit menu
  - View > Toggle Sidebar, Reload
  - Window > standard window controls

- [ ] Add tray icon (optional):
  - Quick access to running servers
  - Status indicator

**Validation**: Handles edge cases gracefully, feels polished

---

### Phase 9: Web App Foundation (Future)

**Goal**: Web interface for remote access

- [ ] Create `/web-app` with Next.js
- [ ] Set up Supabase project
- [ ] Mirror data model to Supabase:
  - projects table
  - journeys table
  - Add user_id for multi-tenancy

- [ ] Implement web UI:
  - Project list
  - Journey board
  - Status views

- [ ] Add local app ↔ web app bridge:
  - Local app exposes WebSocket server
  - Web app connects to send commands
  - Commands: start servers, open Claude, etc.

---

## Quick Start Commands

After Phase 1, from `/local-app`:

```bash
# Development with hot reload
npm run dev

# Build for production
npm run build

# Package as macOS app (add electron-builder)
npm run package
```

---

## Key Technical Decisions

### Monorepo structure
- Allows shared types between local and web app
- Clear separation of concerns
- Independent versioning and deployment

### SQLite for local app
- Works offline
- Fast queries
- Easy migration path to sync with Supabase later

### Port allocation strategy
- Rails: 4001-4020
- React: 4201-4220
- 20 parallel journeys supported
- Ports tracked in DB, released on journey delete

---

## Success Criteria for MVP

MVP is complete when you can:

1. Add a project (select monorepo folder)
2. Create a journey (auto-creates git worktree)
3. Open journey in Claude Code (correct directory)
4. Start Rails + React dev servers
5. See server status indicators in dashboard
6. Open running app in browser
7. Stop servers
8. Delete journey (cleans up worktree)

This delivers the core value: **parallel development with isolated environments**.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Claude Code CLI changes | Abstract behind service, add fallback to VS Code |
| Git worktree edge cases | Thorough status checks before operations |
| Zombie processes | Track PIDs, cleanup on quit, periodic health check |
| Port exhaustion | Availability check, user override option |
| Database corruption | WAL mode, regular backups, migration system |

---

## Next Steps

1. **Phase 0**: Create folder structure
2. **Phase 1**: Scaffold Electron app in `/local-app`
3. Work through phases sequentially, validating each
4. Use the app daily as you build it (dogfooding)

---

*Document created: December 2024*
