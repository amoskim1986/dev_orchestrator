# Development Orchestrator - Claude Code Context

## Project Overview
A multi-universe development environment orchestrator that enables parallel development of multiple features (journeys) across projects, each with its own local environment and Claude Code AI session.

## Architecture
```
dev_orchestrator/
├── local-app/      # Electron desktop app (git, processes, Claude launcher)
├── web-app/        # Standalone React web app (Vercel deployable)
├── shared/         # Shared types, hooks, and Supabase client
└── _planning_docs/ # Planning documentation
```

## Shared Package (`@dev-orchestrator/shared`)

The `shared/` directory is an npm workspace package that contains code used by both `local-app` and `web-app`:

### Contents
- **Types** (`shared/src/types/`) - TypeScript interfaces for Project, Journey, and related types
- **Hooks** (`shared/src/hooks/`) - React data hooks (`useProjects`, `useJourneys`)
- **Supabase Client** (`shared/src/lib/`) - Configurable Supabase client factory

### Usage
Both apps import from the shared package:
```typescript
// Import types
import type { Project, Journey, JourneyStatus } from '@dev-orchestrator/shared';

// Import hooks
import { useProjects, useJourneys } from '@dev-orchestrator/shared';

// Initialize Supabase (in main.tsx)
import { initSupabase } from '@dev-orchestrator/shared';
initSupabase({ url: '...', key: '...' });
```

### Why Shared?
- **Single source of truth** for types and data logic
- **Consistency** between web and desktop apps
- **DRY principle** - changes propagate to both apps
- **Easier maintenance** - fix bugs in one place

## Current Phase
**Phase 3: Basic UI** - Complete (both apps)

## Node Version
Requires Node 22+. Use nvm:
```bash
nvm use 22
```

## Tech Stack

### Shared (both apps)
- React + TypeScript
- Tailwind CSS (dark theme)
- Supabase (PostgreSQL backend)

### Local App (`/local-app`)
- Electron + electron-vite
- Zustand (state management)
- node-pty + xterm (terminal)

### Web App (`/web-app`)
- Vite
- Deployable to Vercel

## Key Concepts
| Concept | Description |
|---------|-------------|
| Project | A software project (monorepo) with frontend + backend |
| Journey | A feature/bug/task being developed in parallel |
| Worktree | A git worktree - dedicated folder/branch for a Journey |
| Instance | Running pair of dev servers (Rails + React) per Journey |

## Port Allocation
- Rails servers: 4001-4020
- React servers: 4201-4220
- Web app dev: 3020

## Commands
```bash
# Install all workspaces
npm install

# Local app development
cd local-app && npm run dev

# Web app development
cd web-app && npm run dev

# Build web app for deployment
cd web-app && npm run build
```

## File Naming Conventions
- Components: PascalCase (e.g., `JourneyCard.tsx`)
- Services: kebab-case with .service suffix (e.g., `git.service.ts`)
- IPC handlers: kebab-case (e.g., `projects.ts`)
- Stores: camelCase with Store suffix (e.g., `projectStore.ts`)
- Hooks: camelCase with use prefix (e.g., `useProjects.ts`)

## Database (Supabase)
Using Supabase PostgreSQL for cloud-first data storage.

Key tables:
- `projects` - id, name, root_path, frontend_path, backend_path, start commands
- `journeys` - id, project_id, name, branch_name, worktree_path, status, ports, pids

## Journey Status Flow
```
Planning → In Progress → Ready → Deployed
```

## Implementation Progress
- [x] Phase 0: Folder structure
- [x] Phase 1: Electron scaffold
- [x] Phase 2: Supabase data layer
- [x] Phase 3: Basic UI (local + web)
- [x] Shared package setup
- [ ] Phase 4: Git worktree integration
- [ ] Phase 5: Claude Code launcher
- [ ] Phase 6: Process management
- [ ] Phase 7: Workflow actions
- [ ] Phase 8: Polish

## Capability Comparison

| Capability | Local App | Web App |
|------------|-----------|---------|
| View projects & journeys | Yes | Yes |
| Create/edit projects & journeys | Yes | Yes |
| Git worktree operations | Yes | No |
| Launch Claude Code | Yes | No |
| Start/stop dev servers | Yes | No |
| Process monitoring | Yes | View status only |

## Running the Electron App

### Prerequisites
```bash
# Ensure Node 22+ is active
nvm use 22

# Install dependencies with Python 3.10 for native modules
cd /path/to/dev_orchestrator
PYTHON=/usr/local/bin/python3.10 npm install

# Rebuild native modules for Electron
cd local-app
PYTHON=/usr/local/bin/python3.10 npm run rebuild
```

### Running the App
**IMPORTANT**: When running from VSCode/Claude Code, the `ELECTRON_RUN_AS_NODE=1` environment variable may be set. This causes Electron to behave like plain Node instead of providing Electron APIs.

**Fix**: Unset the variable before running:
```bash
unset ELECTRON_RUN_AS_NODE && npm run dev
```

Or use a terminal OUTSIDE of VSCode to run the app.

### Troubleshooting Electron Startup

**Error**: `TypeError: Cannot read properties of undefined (reading 'whenReady')`

**Cause**: This happens when `require('electron')` returns a path string instead of the Electron API object. This is typically caused by:
1. `ELECTRON_RUN_AS_NODE=1` being set (common in VSCode)
2. Module resolution finding the npm `electron` package before Electron's built-in module

**Solutions**:
1. Unset ELECTRON_RUN_AS_NODE: `unset ELECTRON_RUN_AS_NODE`
2. Run from a different terminal outside VSCode
3. Verify with: `env | grep ELECTRON` (should show nothing)

**Verify Electron is working**:
```bash
unset ELECTRON_RUN_AS_NODE
./node_modules/electron/dist/Electron.app/Contents/MacOS/Electron --version
# Should output: v33.x.x (Electron version, not Node version)
```

### Refreshing the App / Clearing Cache

If the app shows stale content or a blank screen:

1. **Refresh the window**: Press `Cmd+R` in the Electron window
2. **Rebuild dist folder** (if deleted or corrupted):
   ```bash
   cd local-app && npm run build
   ```
3. **Clear Vite cache** (for stubborn issues):
   ```bash
   rm -rf local-app/node_modules/.vite
   ```
4. **Full restart**: Close the app window, then run `npm run dev` again

### Stopping the App

**IMPORTANT**: Do NOT use broad `pkill` commands that match "Electron" - this will kill VSCode, Cursor, and other Electron-based apps!

**Safe way to stop the Dev Orchestrator app:**
```bash
# Find the specific process first
ps aux | grep "electron-vite" | grep -v grep

# Kill only the electron-vite dev server (this stops the app)
pkill -f "electron-vite dev"
```

Or simply close the app window - it will quit on macOS when all windows are closed (unless you Cmd+Q).

**NEVER do this:**
```bash
# BAD - kills VSCode, Cursor, Discord, etc!
pkill -f "Electron"
```

## Notes
- Keep Electron main process logic in `/local-app/electron/`
- Keep React renderer in `/local-app/src/`
- Use IPC for all main ↔ renderer communication
- Prefer dark theme for dev tool aesthetic
- Web app is read-heavy; system operations require desktop app
