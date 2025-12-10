# Development Orchestrator - Claude Code Context

## Project Overview
A multi-universe development environment orchestrator that enables parallel development of multiple features (journeys) across projects, each with its own local environment and Claude Code AI session.

## Architecture
```
dev_orchestrator/
├── local-app/     # Electron desktop app (git, processes, Claude launcher)
├── web-app/       # Future: Web interface (Supabase, remote access)
├── shared/        # Shared types and utilities
└── _planning_docs/ # Planning documentation
```

## Current Phase
**Phase 2: Database Layer** - Next up

## Node Version
Requires Node 20.19+. Use nvm:
```bash
nvm use  # reads .nvmrc in local-app/
```

## Tech Stack (local-app)
- Electron + electron-vite
- React + TypeScript
- Tailwind CSS
- Zustand (state management)
- SQLite via better-sqlite3
- simple-git (git operations)

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

## Commands
```bash
# From /local-app (after setup)
npm run dev      # Development with hot reload
npm run build    # Production build
```

## File Naming Conventions
- Components: PascalCase (e.g., `JourneyCard.tsx`)
- Services: kebab-case with .service suffix (e.g., `git.service.ts`)
- IPC handlers: kebab-case (e.g., `projects.ts`)
- Stores: camelCase with Store suffix (e.g., `projectStore.ts`)

## Database Schema (SQLite)
Key tables:
- `projects` - id, name, root_path, frontend_path, backend_path, start commands
- `journeys` - id, project_id, name, branch_name, worktree_path, status, ports, pids

## Journey Status Flow
```
Planning → In Progress → Ready → Deployed
```

## Implementation Progress
- [x] Initial planning document
- [x] Phase 0: Folder structure
- [x] Phase 1: Electron scaffold
- [ ] Phase 2: Database layer
- [ ] Phase 3: Basic UI
- [ ] Phase 4: Git worktree integration
- [ ] Phase 5: Claude Code launcher
- [ ] Phase 6: Process management
- [ ] Phase 7: Workflow actions
- [ ] Phase 8: Polish

## Notes
- Keep Electron main process logic in `/local-app/electron/`
- Keep React renderer in `/local-app/src/`
- Use IPC for all main ↔ renderer communication
- Prefer dark theme for dev tool aesthetic
