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

### Data Architecture Decision

**We chose Supabase over local SQLite** for the data layer. This gives us:
- Cloud sync from day one
- Same backend works for both Electron app and future web app
- No need for IPC-based database access (Supabase client runs in renderer)
- Simpler architecture with fewer files

```
┌─────────────────────────────────────────────────────────────────┐
│                     RENDERER (React)                            │
│  ┌─────────────┐                                                │
│  │ Component   │ ──calls──> supabase.from('projects').select()  │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (Supabase JS Client)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE (Cloud)                            │
│  ┌─────────────────┐     ┌──────────────────┐                   │
│  │ PostgREST API   │────>│ PostgreSQL       │                   │
│  └─────────────────┘     └──────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

### Separation of Concerns

| Capability | Local App | Web App |
|------------|-----------|---------|
| View projects & journeys | Yes | Yes |
| Create/edit projects & journeys | Yes (Supabase) | Yes (Supabase) |
| Git worktree operations | Yes | No (triggers local app) |
| Launch Claude Code | Yes | No (triggers local app) |
| Start/stop dev servers | Yes | No (triggers local app) |
| Process monitoring | Yes | View status only |
| Works offline | Limited | No |
| Multi-device access | Yes (data synced) | Yes |

---

## Tech Stack

### Local Desktop App (`/local-app`)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Desktop Shell | Electron | Cross-platform, native system access |
| Frontend | React 18 + TypeScript | Modern, type-safe UI development |
| Styling | Tailwind CSS | Rapid UI development |
| State Management | React hooks + Supabase | Simple data fetching with hooks |
| Database | Supabase (PostgreSQL) | Cloud-first, shared with web app |
| Build Tool | Vite 5 + electron-vite | Fast HMR |
| Node Version | 20.19+ (via nvm) | Required for Vite compatibility |

### Web App (`/web-app`) - Future

| Layer | Technology |
|-------|------------|
| Framework | Next.js or Vite + React |
| Database | Supabase (same as local app) |
| Auth | Optional - currently using service_role key |
| Styling | Tailwind CSS |

---

## Local App Structure (`/local-app`)

```
local-app/
├── electron/                    # Electron main process
│   ├── main.ts                  # Entry point
│   ├── preload.ts               # Secure bridge to renderer
│   ├── ipc/                     # IPC handlers (for system operations)
│   │   ├── worktrees.ts         # Git worktree operations
│   │   ├── processes.ts         # Server management
│   │   └── claude.ts            # Claude Code launcher
│   └── services/                # Business logic
│       ├── git.service.ts       # Git/worktree operations
│       ├── process.service.ts   # Server management
│       ├── port.service.ts      # Port allocation
│       └── claude.service.ts    # Claude Code launcher
├── src/                         # React renderer
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── layout/
│   │   ├── projects/
│   │   ├── journeys/
│   │   └── common/
│   ├── hooks/                   # Data hooks (Supabase)
│   │   ├── useProjects.ts
│   │   └── useJourneys.ts
│   ├── lib/
│   │   └── supabase.ts          # Supabase client
│   └── types/
│       ├── index.ts             # Entity types
│       └── database.ts          # Supabase DB types
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── .env                         # Supabase credentials (gitignored)
├── .env.example                 # Template for credentials
├── .nvmrc                       # Node version (20.19.5)
├── package.json
├── electron.vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## Implementation Phases & Checklists

### Phase 0: Repository Setup ✅ COMPLETE

**Goal**: Set up monorepo structure

- [x] Create folder structure (`local-app/`, `web-app/`, `shared/`)
- [x] Initialize root package.json with workspaces
- [x] Update .gitignore for all sub-projects

**Validation**: Clean folder structure ready for development

---

### Phase 1: Local App Scaffolding ✅ COMPLETE

**Goal**: Get a working Electron + React app running

- [x] Initialize local-app with npm
- [x] Install core dependencies (electron, react, vite, tailwind)
- [x] Create `electron.vite.config.ts` with separate output dirs
- [x] Create `tsconfig.json`
- [x] Set up Tailwind CSS
- [x] Create `electron/main.ts` with basic window creation
- [x] Create `electron/preload.ts` with contextBridge setup
- [x] Create React entry point and App component
- [x] Configure dev server on port 3010
- [x] Set up Node 20.19+ via `.nvmrc`

**Key files created**:
- `electron/main.ts` - Uses `!app.isPackaged` for dev detection
- `electron.vite.config.ts` - Outputs to `dist-electron/main/` and `dist-electron/preload/`
- `.nvmrc` - Specifies Node 20.19.5

**Validation**: `npm run dev` shows Electron window with React content

---

### Phase 2: Database & Data Layer ✅ COMPLETE

**Goal**: Persistent cloud storage for projects and journeys

**Approach Changed**: Using Supabase instead of local SQLite

- [x] Set up Supabase project
- [x] Install `@supabase/supabase-js`
- [x] Create database schema in Supabase:
  ```sql
  -- projects table
  CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    root_path TEXT NOT NULL UNIQUE,
    frontend_path TEXT,
    backend_path TEXT,
    frontend_start_cmd TEXT DEFAULT 'npm run dev',
    backend_start_cmd TEXT DEFAULT 'rails s',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  -- journeys table (branch_name/worktree_path NULL until started)
  CREATE TABLE journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    branch_name TEXT,
    worktree_path TEXT,
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'ready', 'deployed')),
    rails_port INTEGER,
    react_port INTEGER,
    rails_pid INTEGER,
    react_pid INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- [x] Create `src/lib/supabase.ts` - Supabase client (using service_role key)
- [x] Create `src/types/index.ts` - TypeScript types
- [x] Create `src/hooks/useProjects.ts` - CRUD hook
- [x] Create `src/hooks/useJourneys.ts` - CRUD hook with `startJourney` helper
- [x] Create `.env.example` template
- [x] Test CRUD operations via REST API

**Key files created**:
- `src/lib/supabase.ts` - Uses `VITE_SUPABASE_SERVICE_ROLE_KEY`
- `src/hooks/useProjects.ts` - `fetchProjects`, `createProject`, `updateProject`, `deleteProject`
- `src/hooks/useJourneys.ts` - Same + `startJourney(id, branchName, worktreePath)`
- `supabase/migrations/001_initial_schema.sql` - Migration file for reference

**Connection string** (for migrations):
```bash
psql -h aws-0-us-west-2.pooler.supabase.com -p 6543 -d postgres -U postgres.bxkxrzbgnfdurlshrgzu
```

**Validation**: Can create/read/update/delete projects and journeys via Supabase

---

### Phase 3: Basic UI Shell ✅ COMPLETE

**Goal**: Navigation and layout working

**Note**: This phase includes journey type tabs, stage badges, detail panel, project intake AI feature, and project tabs in Journeys view - enhanced beyond the original scope.

- [x] Install UI dependencies (zustand already installed)

- [x] Create layout components:
  - `Layout.tsx` - combines sidebar + content area
  - `Sidebar.tsx` - tab navigation (Dashboard, History, Projects, Journeys)
  - `TitleBar.tsx` - draggable title bar

- [x] Create project components:
  - `ProjectsTab.tsx` - main projects view
  - `ProjectCard.tsx` - single project item with delete
  - `AddProjectModal.tsx` - folder picker + project setup

- [x] Create journey components:
  - `JourneysTab.tsx` - main journeys view
  - `JourneyBoard.tsx` - kanban-style columns by status
  - `JourneyCard.tsx` - single journey card with actions
  - `StatusBadge.tsx` - colored status indicator
  - `AddJourneyModal.tsx` - create journey form

- [x] Create common components:
  - `Button.tsx` - styled button variants (primary, secondary, danger, ghost)
  - `Modal.tsx` - modal wrapper with escape key handling
  - `Input.tsx` - styled input with label and error support

- [x] Wire up data:
  - Use `useProjects()` hook to load projects
  - Use `useJourneys(projectId)` hook to load journeys
  - Handle loading and error states

- [x] Style with Tailwind (dark theme)

- [x] Add dialog IPC for folder selection

**Key files created**:
- `src/components/common/` - Button, Modal, Input
- `src/components/projects/` - ProjectsTab, ProjectCard, AddProjectModal
- `src/components/journeys/` - JourneysTab, JourneyBoard, JourneyCard, StatusBadge, AddJourneyModal
- `electron/ipc/dialog.ipc.ts` - Folder selection dialog

**Validation**: Can view projects, create/delete projects, see kanban journey board, create journeys

---

### Phase 3b: Project Intake AI Feature ✅ COMPLETE

**Goal**: AI-powered project intake refinement

- [x] Create database migration `003_project_intake.sql`:
  - `raw_intake` - raw text from user
  - `raw_intake_previous` - for diff comparison
  - `ai_parsed_intake` - AI-refined document
  - `ai_parsed_at` - timestamp of AI generation
  - `intake_updated_at` - last content update

- [x] Update `shared/src/types/index.ts` with new Project fields

- [x] Add AI prompts (`local-app/electron/services/claude-cli/prompts.ts`):
  - `buildProjectIntakeRefinementPrompt()` - transforms raw intake to structured doc
    - Sections: Overview → Goals → Features → Constraints → Tech Requirements → Architecture
    - Only includes sections with explicit content (no fabrication)
  - `buildProjectIntakeUpdatePrompt()` - diff-based update suggestions

- [x] Add IPC handlers (`local-app/electron/ipc/claude-cli.ipc.ts`):
  - `claude:refineProjectIntake`
  - `claude:analyzeProjectIntakeChanges`

- [x] Update preload.ts and claudeCliStore

- [x] Create local-app components:
  - `ProjectIntakeEditor.tsx` - tabbed Raw/AI interface with AI generation
  - `IntakeChangesDialog.tsx` - diff dialog when saving raw changes
  - `ProjectDetailModal.tsx` - full project detail view
  - Update `ProjectCard.tsx` with intake status indicator

- [x] Create web-app components:
  - `ProjectIntakeEditor.tsx` - simpler version (no AI, debounced auto-save)
  - `ProjectDetailPanel.tsx` - side panel view
  - Update `ProjectCard.tsx` with intake status indicator

**Flow**:
1. User types/pastes raw intake → clicks "Save"
2. If no AI doc exists → prompt to generate
3. If AI doc exists and raw changed → AI compares versions, shows diff dialog
4. User chooses: "Update AI Doc" / "Keep Current" / "Cancel"

**Validation**: Can capture raw intake, generate AI-refined version, and manage updates

---

### Phase 3c: Project Tabs in Journeys ✅ COMPLETE

**Goal**: Easy project switching in Journeys view

- [x] Update both `JourneysTab.tsx` files (local-app and web-app):
  - Changed from `selectedProject` state to `selectedProjectId`
  - Auto-select first project when projects load
  - Project tabs at top with horizontal scroll
  - Journey type tabs below project tabs
  - Inline loading/error states for journeys

**Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Project: [Project A] [Project B] [Project C]                   │
├─────────────────────────────────────────────────────────────────┤
│  [📋 Planning] [✨ Feature] [🐛 Bug] [🔍 Investigation]         │
├─────────────────────────────────────────────────────────────────┤
│  Journey cards...                                               │
└─────────────────────────────────────────────────────────────────┘
```

**Validation**: Can switch between projects without leaving Journeys view

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

- [ ] Update Journey "Start" flow:
  - Journey starts in 'planning' status with NULL branch/worktree
  - User clicks "Start Journey" → auto-generates branch name from journey name
  - Creates worktree in `{repoPath}/.worktrees/{journey-slug}/`
  - Updates journey with `startJourney(id, branchName, worktreePath)`
  - Status changes to 'in_progress'

- [ ] Add UI elements:
  - Git status indicator on journey card
  - Branch name display (only shown after started)
  - "Push Branch" action button
  - "Start Journey" button for planning journeys

- [ ] Handle journey deletion:
  - Confirm dialog
  - Remove worktree (if exists)
  - Delete from database

**Validation**: Starting journey creates worktree, deleting cleans up

---

### Phase 5: Claude Code Integration ✅ COMPLETE

**Goal**: Launch Claude Code in correct worktree context

**Implementation**: VS Code + Claude Code Launcher Service

VS Code has a built-in `code chat` command that sends prompts directly to Claude Code:
```bash
code chat "Your prompt" --mode agent --reuse-window
```

- [x] Create `electron/services/vscode-launcher/` service:
  - `vscode-launcher.service.ts` - Core logic with VS Code detection, launch, and chat
  - `types.ts` - TypeScript interfaces
  - `prompts.ts` - Contextual prompt templates by journey type/stage
  - `index.ts` - Public API exports

- [x] Create `electron/ipc/vscode-launcher.ipc.ts` IPC handlers:
  - `vscode:getStatus` - Check VS Code installation
  - `vscode:launch` - Open VS Code with optional prompt
  - `vscode:launchForJourney` - Open with contextual prompt

- [x] Update `electron/preload.ts` - Expose `window.electronAPI.vscode` API

- [x] Add "VS Code" button to JourneyCard
  - Only shown for started journeys (with worktree_path)
  - Opens VS Code at worktree, then sends prompt to Claude Code

- [x] Contextual prompts generated per journey type/stage:
  - `feature_planning` → Spec/planning prompts
  - `feature` → Implementation prompts
  - `bug` → Investigation/fix prompts
  - `investigation` → Research prompts

**Also available**:
- "Open in Terminal" button (existing terminal IPC)

**Validation**: ✅ Clicking "VS Code" opens VS Code at worktree with Claude Code prompt

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
  - Update Supabase with PIDs and ports
  - Clean up on app quit (beforeunload)
  - Handle process crashes

- [ ] Update UI:
  - Server status dots on journey card (red/yellow/green)
  - "Start Servers" / "Stop Servers" buttons
  - "Open in Browser" button (opens localhost:port)
  - Individual server controls

- [ ] Add process output viewer (optional):
  - Expandable console panel
  - Stream stdout/stderr
  - Clear logs button

**Validation**: Can start/stop servers, see status, open in browser

---

### Phase 7: Actions & Workflow Polish

**Goal**: Complete journey lifecycle

- [ ] Implement journey status transitions:
  ```
  Planning → In Progress → Ready → Deployed
  (with ability to move backwards)
  ```

- [ ] Implement journey actions:
  - "Start Journey" - creates worktree, changes to in_progress
  - "Mark as Ready" - status change
  - "Mark as Deployed" - status change
  - "Push Branch" - git push with feedback
  - "Create PR" - opens GitHub PR URL in browser
  - "Open in Browser" - opens localhost with correct ports

- [ ] Add context menu to journey cards:
  - Right-click for full action list
  - Quick actions visible on card

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
  - Supabase connection errors

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

Since we're using Supabase, the web app is simpler:

- [ ] Create `/web-app` with Next.js or Vite + React
- [ ] Use same Supabase client configuration
- [ ] Implement web UI:
  - Project list
  - Journey board
  - Status views (read-only for system operations)

- [ ] Add local app ↔ web app bridge (for system operations):
  - Local app exposes WebSocket server
  - Web app connects to send commands
  - Commands: start servers, open Claude, create worktree

- [ ] Consider adding Supabase Auth if multi-user needed

---

## Quick Start Commands

From `/local-app`:

```bash
# Ensure correct Node version
nvm use

# Development with hot reload
npm run dev

# Build for production
npm run build

# Package as macOS app (add electron-builder later)
npm run package
```

---

## Key Technical Decisions

### Supabase over SQLite
- Cloud sync from day one
- Same backend for local and web app
- Simpler architecture (no IPC for data)
- Service role key bypasses RLS (simpler for solo use)

### Monorepo structure
- Allows shared types between local and web app
- Clear separation of concerns
- Independent versioning and deployment

### Journey lifecycle
- Journeys start in 'planning' with NULL branch/worktree
- "Start Journey" creates the worktree and sets branch_name
- This allows planning without creating branches

### Port allocation strategy
- Rails: 4001-4020
- React: 4201-4220
- 20 parallel journeys supported
- Ports tracked in Supabase, released on journey delete

---

## Success Criteria for MVP

MVP is complete when you can:

1. ✅ Add a project (select monorepo folder)
2. ✅ Create a journey (in planning state)
3. Start a journey (creates git worktree) - *Phase 4: Git worktree pending*
4. ✅ Open journey in VS Code with Claude Code (correct directory + contextual prompt)
5. Start Rails + React dev servers - *Phase 6: Process management pending*
6. See server status indicators in dashboard - *Phase 6*
7. Open running app in browser - *Phase 6*
8. Stop servers - *Phase 6*
9. Delete journey (cleans up worktree) - *Phase 4*

This delivers the core value: **parallel development with isolated environments**.

### Current Progress
- **Phase 1-3**: ✅ Complete (Electron app, Supabase, basic UI)
- **Phase 3b**: ✅ Complete (Project intake AI feature)
- **Phase 3c**: ✅ Complete (Project tabs in Journeys view)
- **Phase 4**: ⏳ Pending (Git worktree integration)
- **Phase 5**: ✅ Complete (VS Code + Claude Code launcher)
- **Phase 6**: ⏳ Pending (Process management)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Claude Code CLI changes | Using VS Code's `code chat` command - stable public API |
| Git worktree edge cases | Thorough status checks before operations |
| Zombie processes | Track PIDs, cleanup on quit, periodic health check |
| Port exhaustion | Availability check, user override option |
| Supabase connection issues | Show offline indicator, retry logic |
| Service role key exposure | Keep in .env (gitignored), consider auth later |

---

## Completed Commits

1. `163c2d7` - Add detailed implementation plan
2. `967887b` - Add Electron + React scaffold (Phase 0 & 1)
3. `9a1c57a` - Add draggable title bar
4. `9455d6b` - Add Supabase data layer (Phase 2)

---

*Document created: December 2024*
*Last updated: December 2024 (Phase 3b/3c complete - Project intake AI + Project tabs in Journeys)*
