# Enhanced Journey Schema & Multi-Target Projects

> **Status**: Partially Implemented
> **Created**: 2024-12-12
> **Last Updated**: 2024-12-12 (Added Phase 4 UI Implementation Roadmap)
> **Scope**: Database schema expansion, TypeScript types, React hooks, UI components

---

## Overview

This document outlines the expanded database schema to support:

1. **Journey Types** with type-specific stages (feature_planning, feature, bug, investigation)
2. **Journey Hierarchy** (parent/child relationships)
3. **Intake Versioning** with AI refinement
4. **Multi-Target Projects** (rails, web, electron, mobile, chrome extension, etc.)
5. **Session Tracking** with multiple AI tools (Claude Code, Cursor, Copilot, etc.)
6. **Parallelization Support** for concurrent journey execution
7. **Project Intake AI Refinement** with diff-based updates

---

## Recently Completed Features

### Project Intake AI Refinement ✅ (December 2024)

Added ability to capture raw intake text for projects, process through Claude AI, and manage both versions.

**Database Schema** (`003_project_intake.sql`):
```sql
ALTER TABLE projects
ADD COLUMN raw_intake TEXT,
ADD COLUMN raw_intake_previous TEXT,        -- for diff comparison
ADD COLUMN ai_parsed_intake TEXT,
ADD COLUMN ai_parsed_at TIMESTAMPTZ,        -- when AI generation happened
ADD COLUMN intake_updated_at TIMESTAMPTZ;
```

**AI Prompts** (`local-app/electron/services/claude-cli/prompts.ts`):
- `buildProjectIntakeRefinementPrompt()` - Initial AI refinement
  - Sections in order: Overview → Goals → Features → Constraints → Tech Requirements → Architecture
  - Only includes sections with explicit content (no fabrication)
- `buildProjectIntakeUpdatePrompt()` - Diff-based update suggestions
  - Compares old vs new raw content
  - Returns changes summary + updated AI document

**IPC Handlers** (`local-app/electron/ipc/claude-cli.ipc.ts`):
- `claude:refineProjectIntake` - Initial generation
- `claude:analyzeProjectIntakeChanges` - Diff analysis and update

**UI Components**:

| Component | App | Purpose |
|-----------|-----|---------|
| `ProjectIntakeEditor` | Local | Tabbed interface (Raw/AI), AI generation, explicit save |
| `ProjectIntakeEditor` | Web | Simpler version, no AI generation, debounced auto-save |
| `IntakeChangesDialog` | Local | Shows diff when saving raw changes, prompts for AI update |
| `ProjectDetailModal` | Local | Full project detail view with intake editor |
| `ProjectDetailPanel` | Web | Side panel view with intake editor |
| `ProjectCard` | Both | Updated with intake status indicator (green=AI, yellow=raw) |

**Flow**:
1. User types/pastes raw intake in "Raw Intake" tab
2. User clicks "Save"
3. If no AI doc exists → prompt to generate
4. If AI doc exists and raw changed → AI compares versions, shows diff dialog
5. User chooses: "Update AI Doc" / "Keep Current" / "Cancel"

### Project Tabs in Journeys View ✅ (December 2024)

Changed Journeys tab to show projects as tabs at the top for easy switching (both apps).

**Before**: Separate project selection screen
**After**: Project tabs at top → Journey type tabs below → Journey cards

```
┌─────────────────────────────────────────────────────────────────┐
│  Project: [Project A] [Project B] [Project C]                   │  ← Project tabs
├─────────────────────────────────────────────────────────────────┤
│  [📋 Planning] [✨ Feature] [🐛 Bug] [🔍 Investigation]         │  ← Journey type tabs
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Journey cards...                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation**:
- Changed from `selectedProject` state to `selectedProjectId` with auto-select first project
- Added project tabs at top with horizontal scroll for many projects
- Journey type tabs moved below project tabs
- Inline loading/error states for journeys

---

## Pending UI Features (Summary)

The journey detail panel should have **tabs** for different aspects of a journey:

```
┌─────────────────────────────────────────────────────────────────┐
│  Journey: "Add User Authentication"                         ✕  │
│  📋 Feature Planning • Stage: speccing                          │
├─────────────────────────────────────────────────────────────────┤
│  [Overview] [Intake] [Spec] [Plan] [Checklists] [Links]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Tab content here...                                            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  [← Previous Stage]  [Next Stage →]  [VS Code]  [Terminal]     │
└─────────────────────────────────────────────────────────────────┘
```

### Tab Descriptions

| Tab | Content | Status |
|-----|---------|--------|
| **Overview** | Basic info, description, tags, source URL, stage progress | ✅ Done |
| **Intake** | Raw content, AI-refined content, version history | ❌ Pending |
| **Spec** | Markdown spec document, AI generation button | ❌ Pending |
| **Plan** | Structured implementation plan with legs/steps | ❌ Pending |
| **Checklists** | Per-leg task lists with typed items | ❌ Pending |
| **Links** | Related journeys, parent/children, dependencies | ❌ Pending |

### Derivative Journeys

When a Feature Planning journey reaches "approved" stage:
- Show "Spawn Feature Journey" button
- Creates a new Feature journey linked to the plan
- The Feature journey shows breadcrumb: "From: [Parent Journey Name]"
- Parent shows list of spawned children

### Current Implementation

What's done:
- Tabbed journey type interface (Feature Planning, Feature, Bug, Investigation)
- Journey cards with type/stage badges
- Detail panel with edit capability
- Stage forward/backward navigation
- Quick intake form per type tab
- **Project tabs** at top of Journeys view for easy switching between projects
- **Project intake AI refinement** with tabbed Raw/AI view and diff-based updates

---

## Detailed Tab Mockups

### Intake Tab

```
┌─────────────────────────────────────────────────────────────────┐
│  INTAKE                                                         │
├─────────────────────────────────────────────────────────────────┤
│  Version: v3 (Latest)  [v1] [v2] [v3]                          │
│                                                                 │
│  ┌─ Raw Content ─────────────────────────────────────────────┐ │
│  │ Users should be able to log in with email/password.       │ │
│  │ We also need OAuth support for Google and GitHub.         │ │
│  │ The session should persist across browser closes.         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [🤖 Refine with AI]                                           │
│                                                                 │
│  ┌─ AI Refined ──────────────────────────────────────────────┐ │
│  │ **Title**: User Authentication System                      │ │
│  │                                                            │ │
│  │ **Problem**: Users need secure authentication with         │ │
│  │ multiple login options and persistent sessions.            │ │
│  │                                                            │ │
│  │ **User Stories**:                                          │ │
│  │ - As a user, I can log in with email/password              │ │
│  │ - As a user, I can log in with Google OAuth                │ │
│  │ - As a user, I can log in with GitHub OAuth                │ │
│  │ - As a user, my session persists when I close browser      │ │
│  │                                                            │ │
│  │ **Acceptance Criteria**:                                   │ │
│  │ - [ ] Login form validates email format                    │ │
│  │ - [ ] Password has minimum strength requirements           │ │
│  │ - [ ] OAuth buttons redirect correctly                     │ │
│  │ - [ ] Session cookie is httpOnly and secure                │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [Save Changes]  [Generate Spec →]                             │
└─────────────────────────────────────────────────────────────────┘
```

### Spec Tab

```
┌─────────────────────────────────────────────────────────────────┐
│  SPEC                                          [🤖 Generate]    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ # User Authentication System                                ││
│  │                                                             ││
│  │ ## Overview                                                 ││
│  │ Implement a secure authentication system supporting         ││
│  │ email/password and OAuth providers.                         ││
│  │                                                             ││
│  │ ## Technical Approach                                       ││
│  │                                                             ││
│  │ ### Components                                              ││
│  │ | Component | Purpose | Changes |                          ││
│  │ |-----------|---------|---------|                          ││
│  │ | AuthContext | Store auth state | New |                   ││
│  │ | LoginForm | Email/password form | New |                  ││
│  │ | OAuthButtons | Google/GitHub | New |                     ││
│  │                                                             ││
│  │ ### API Changes                                             ││
│  │ - POST /api/auth/login                                      ││
│  │ - POST /api/auth/register                                   ││
│  │ - GET /api/auth/oauth/:provider                             ││
│  │ - POST /api/auth/logout                                     ││
│  │                                                             ││
│  │ ## Testing                                                  ││
│  │ - Unit tests for auth context                               ││
│  │ - Integration tests for login flow                          ││
│  │ - E2E test for complete auth journey                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  [Save]  [Generate Plan →]                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Plan Tab

```
┌─────────────────────────────────────────────────────────────────┐
│  PLAN                                          [🤖 Generate]    │
├─────────────────────────────────────────────────────────────────┤
│  Estimated Effort: Medium (~3-5 days)                          │
│                                                                 │
│  ┌─ Leg 1: Backend Auth Setup ──────────────────────────────┐  │
│  │  ≡  [Expand/Collapse]                                     │  │
│  │                                                           │  │
│  │  Tasks:                                                   │  │
│  │  1. Create User model with password digest                │  │
│  │  2. Add sessions table for token storage                  │  │
│  │  3. Create AuthController with login/logout actions       │  │
│  │  4. Add JWT token generation service                      │  │
│  │                                                           │  │
│  │  Files to create: app/models/user.rb, app/controllers/... │  │
│  │  Est. time: 4 hours                                       │  │
│  │                                                           │  │
│  │  [Edit] [Delete] [↑] [↓]                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ Leg 2: Frontend Auth Components ────────────────────────┐  │
│  │  ≡  [Expand/Collapse]                                     │  │
│  │  ...                                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ Leg 3: OAuth Integration ───────────────────────────────┐  │
│  │  ...                                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [+ Add Leg]                                                    │
│                                                                 │
│  [Save]  [Generate Checklists →]                               │
└─────────────────────────────────────────────────────────────────┘
```

### Checklists Tab

```
┌─────────────────────────────────────────────────────────────────┐
│  CHECKLISTS                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Leg 1: Backend Auth Setup          [2/5 complete] ████░░░ 40% │
│  ─────────────────────────────────────────────────────────────  │
│  ☑ 📦 Create User model              ✓ Dec 10                  │
│  ☑ 📦 Add sessions table             ✓ Dec 10                  │
│  ☐ 📦 Create AuthController                                    │
│  ☐ 🧪 Unit tests for User model                                │
│  ☐ 👁 Verify password hashing works                            │
│  [+ Add item]                                                   │
│                                                                 │
│  Leg 2: Frontend Auth               [0/4 complete] ░░░░░░░  0% │
│  ─────────────────────────────────────────────────────────────  │
│  ☐ 📦 Create AuthContext                                       │
│  ☐ 📦 Build LoginForm component                                │
│  ☐ 🧪 Jest tests for AuthContext                               │
│  ☐ 👁 Manual test login flow                                   │
│  [+ Add item]                                                   │
│                                                                 │
│  Legend: 📦 Deliverable  🧪 Test  👁 Manual Check              │
└─────────────────────────────────────────────────────────────────┘
```

### Links Tab (Derivative Journeys)

```
┌─────────────────────────────────────────────────────────────────┐
│  LINKS & RELATIONSHIPS                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ Parent Journey ─────────────────────────────────────────┐  │
│  │  (none - this is a root journey)                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ Spawned From This Plan (2) ─────────────────────────────┐  │
│  │                                                           │  │
│  │  ✨ [Feature] Implement Auth Backend    Stage: testing   │  │
│  │     └─ Leg 1 & 2 of this plan                            │  │
│  │                                                           │  │
│  │  ✨ [Feature] Implement Auth Frontend   Stage: implementing│  │
│  │     └─ Leg 3 of this plan                                │  │
│  │                                                           │  │
│  │  [+ Spawn New Feature Journey]                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ Dependencies ───────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  This journey depends on:                                 │  │
│  │  (none)                                                   │  │
│  │                                                           │  │
│  │  Blocked by this journey:                                 │  │
│  │  🐛 [Bug] Fix session timeout    Stage: reported         │  │
│  │                                                           │  │
│  │  [+ Add Dependency]                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ Related Journeys ───────────────────────────────────────┐  │
│  │  🔍 [Investigation] OAuth Provider Research  Stage: complete│  │
│  │  [+ Link Related Journey]                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Problem Statement

The current schema is too simplistic:
- Single `status` field doesn't capture the complexity of different journey types
- Hardcoded `rails_port`/`react_port` assumes two-target projects only
- No way to track AI tool sessions or relate journeys to each other
- No support for intake → refinement → spec → plan workflow
- Can't express dependencies or parallelization between journeys

---

## Journey Types & Lifecycles

### 1. Feature Planning
**Purpose**: Spec out and plan a feature → spawns a Feature journey when approved

```
intake → speccing → ui_planning? → planning → review → approved
                                                          ↓
                                              [spawns Feature journey]
```

| Stage | Description |
|-------|-------------|
| `intake` | Raw idea captured (from Notion, doc, ad-hoc) |
| `speccing` | Clarifying, drafting, shaping specs |
| `ui_planning` | (optional) UI/wireframe work if needed |
| `planning` | Claude analyzes codebase, creates implementation plan |
| `review` | Iterate on plan until solid |
| `approved` | Ready to spawn Feature journey with legs & tests |

### 2. Feature (Implementation)
**Purpose**: Build the planned feature

```
review_and_edit_plan → implementing → testing → pre_prod_review → merge_approved → staging_qa → deployed
```

| Stage | Description |
|-------|-------------|
| `review_and_edit_plan` | Review plan from feature_planning, tweak if needed |
| `implementing` | Execute legs with clear deliverables per leg |
| `testing` | Feature-specific tests: unit, integration, Playwright, manual checks |
| `pre_prod_review` | Pull latest staging, resolve conflicts, full test suite, lint/TS |
| `merge_approved` | Push to staging branch |
| `staging_qa` | Manual QA on staging with generated checklist |
| `deployed` | Pushed to production |

### 3. Investigation
**Purpose**: Ad-hoc problem solving (questions, one-off migrations, data inquiries)

```
intake → speccing → planning → approved → in_progress → complete
```

| Stage | Description |
|-------|-------------|
| `intake` | Question or problem captured |
| `speccing` | Clarify approach (e.g., "query prod DB locally with Claude") |
| `planning` | Plan with legs, success criteria, expected output (CSV, answer, etc.) |
| `approved` | Ready to start |
| `in_progress` | Execute legs interactively |
| `complete` | Done |

### 4. Bug
**Purpose**: Fix a bug

```
reported → investigating → fixing → testing → pre_prod_review → merge_approved → staging_qa → deployed
```

| Stage | Description |
|-------|-------------|
| `reported` | Bug intake from Notion, user report, etc. |
| `investigating` | Reproduce, find root cause |
| `fixing` | Write the fix |
| `testing` | Verify fix, check for regressions |
| `pre_prod_review` | Pull staging, resolve conflicts, full tests |
| `merge_approved` | Push to staging |
| `staging_qa` | Manual QA on staging |
| `deployed` | In production |

---

## Data Model

### Entity Relationship Diagram

```
projects
    │
    ├── project_targets (1:many)
    │       │
    │       └── session_processes (via journey_sessions)
    │       └── session_ai_tools (optional link)
    │       └── journey_targets (which journeys affect this target)
    │
    └── journeys (1:many)
            │
            ├── parent_journey_id (self-reference for hierarchy)
            ├── depends_on_journey_id (simple dependency)
            │
            ├── journey_intakes (1:many, versioned)
            ├── journey_specs (1:1)
            ├── journey_plans (1:1)
            ├── journey_checklists (1:many, per leg)
            ├── journey_links (many:many relationships)
            ├── journey_targets (many:many)
            └── journey_sessions (1:many)
                    │
                    ├── session_processes (1:many)
                    └── session_ai_tools (1:many)
```

---

## Database Schema

### Table: `project_targets`
Define what targets a project has.

```sql
CREATE TABLE project_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,              -- 'rails', 'web', 'electron', 'mobile', 'chrome_ext'
  type TEXT NOT NULL,              -- 'backend', 'web_frontend', 'desktop', 'mobile', 'extension'
  path TEXT,                       -- relative path within project
  start_command TEXT,              -- 'bin/rails server', 'npm run dev'
  default_port INT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, name)
);
```

**Example data:**
```
| name     | type         | path            | start_command      | default_port |
|----------|--------------|-----------------|--------------------| -------------|
| rails    | backend      | backend/        | bin/rails server   | 4001         |
| web      | web_frontend | frontend/       | npm run dev        | 4201         |
| electron | desktop      | desktop/        | npm run electron   | null         |
| mobile   | mobile       | mobile/         | npx expo start     | 19000        |
```

### Table: `journeys` (Updated)

```sql
-- Add new columns
ALTER TABLE journeys ADD COLUMN parent_journey_id UUID REFERENCES journeys(id) ON DELETE SET NULL;
ALTER TABLE journeys ADD COLUMN type TEXT DEFAULT 'feature' CHECK (type IN ('bug', 'feature', 'feature_planning', 'investigation'));
ALTER TABLE journeys ADD COLUMN stage TEXT DEFAULT 'intake';
ALTER TABLE journeys ADD COLUMN sort_order REAL DEFAULT 0;
ALTER TABLE journeys ADD COLUMN source_url TEXT;
ALTER TABLE journeys ADD COLUMN tags TEXT[];
ALTER TABLE journeys ADD COLUMN can_parallelize BOOLEAN DEFAULT true;
ALTER TABLE journeys ADD COLUMN depends_on_journey_id UUID REFERENCES journeys(id) ON DELETE SET NULL;

-- Remove old columns (replaced by new structure)
ALTER TABLE journeys DROP COLUMN status;
ALTER TABLE journeys DROP COLUMN rails_port;
ALTER TABLE journeys DROP COLUMN react_port;
ALTER TABLE journeys DROP COLUMN rails_pid;
ALTER TABLE journeys DROP COLUMN react_pid;
```

### Table: `journey_intakes`
Versioned raw intakes with AI refinement.

```sql
CREATE TABLE journey_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  raw_content TEXT,           -- what user wrote/pasted
  refined_content TEXT,       -- AI-processed version
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_journey_intakes_journey ON journey_intakes(journey_id);
```

**Flow:**
1. User pastes/types raw idea
2. On save, Claude CLI refines it with project context
3. New version created each time user edits
4. Thread view shows all versions

### Table: `journey_specs`
The refined "what" document (built from intakes).

```sql
CREATE TABLE journey_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE UNIQUE,
  content TEXT,               -- markdown
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: `journey_plans`
The "how" - implementation plan.

```sql
CREATE TABLE journey_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE UNIQUE,
  content JSONB,              -- structured plan with legs
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Example `content` structure:**
```json
{
  "featureName": "Add dark mode",
  "estimatedComplexity": "medium",
  "steps": [
    {
      "order": 1,
      "title": "Add theme context",
      "description": "Create React context for theme state",
      "filesToCreate": ["src/contexts/ThemeContext.tsx"],
      "filesToModify": ["src/App.tsx"]
    }
  ],
  "risks": ["May need to update all styled components"],
  "dependencies": ["@emotion/styled"]
}
```

### Table: `journey_checklists`
Per-leg task lists with typed items.

```sql
CREATE TABLE journey_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  leg_name TEXT NOT NULL,     -- name of this leg/phase
  items JSONB DEFAULT '[]',   -- typed checklist items
  is_active BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_journey_checklists_journey ON journey_checklists(journey_id);
```

**Checklist item types:**
```json
[
  { "text": "Build the login form component", "type": "deliverable", "done": false },
  { "text": "Unit tests pass for auth flow", "type": "test", "done": false },
  { "text": "Manually verify form validation UX", "type": "manual_check", "done": false }
]
```

### Table: `journey_links`
Flexible relationships between journeys.

```sql
CREATE TABLE journey_links (
  from_journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  to_journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL CHECK (relationship IN ('spawned_from', 'blocks', 'depends_on', 'related_to')),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (from_journey_id, to_journey_id, relationship)
);
```

**Examples:**
- Feature `spawned_from` Feature Planning
- Bug A `blocks` Feature B
- Feature C `depends_on` Feature D
- Investigation `related_to` Feature

### Table: `journey_targets`
Which targets a journey affects.

```sql
CREATE TABLE journey_targets (
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES project_targets(id) ON DELETE CASCADE,
  PRIMARY KEY (journey_id, target_id)
);
```

### Table: `journey_sessions`
Session lifecycle tracking. Many sessions per journey (things crash, restart).

```sql
CREATE TABLE journey_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  checklist_id UUID REFERENCES journey_checklists(id) ON DELETE SET NULL,

  editor TEXT,                -- 'vscode', 'cursor', 'neovim', 'zed'
  editor_workspace TEXT,

  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'crashed', 'abandoned')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_journey_sessions_journey ON journey_sessions(journey_id);
CREATE INDEX idx_journey_sessions_active ON journey_sessions(status) WHERE status = 'active';
```

### Table: `session_processes`
Running processes per session per target.

```sql
CREATE TABLE session_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES journey_sessions(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES project_targets(id) ON DELETE CASCADE,
  pid INT,
  port INT,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'stopped', 'crashed')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_session_processes_session ON session_processes(session_id);
```

### Table: `session_ai_tools`
AI tools used per session (supports multiple simultaneously).

```sql
CREATE TABLE session_ai_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES journey_sessions(id) ON DELETE CASCADE,
  ai_tool TEXT NOT NULL,           -- 'claude_code', 'cursor', 'copilot', 'windsurf'
  session_identifier TEXT,         -- tool-specific path/ID
  target_id UUID REFERENCES project_targets(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_session_ai_tools_session ON session_ai_tools(session_id);
```

**Example session with multiple AI tools:**
```
Session #1 for "Add dark mode"
├── AI Tools:
│   ├── claude_code → backend (rails)
│   ├── cursor → frontend (web)
│   └── cursor → frontend (electron)
├── Processes:
│   ├── rails server → port 4001
│   ├── web dev server → port 4201
│   └── electron → running
└── Editor: vscode workspace
```

---

## Parallelization

### Fields on `journeys`

```sql
can_parallelize BOOLEAN DEFAULT true  -- can run alongside other journeys
depends_on_journey_id UUID            -- simple "comes after" dependency
```

### Query: Find journeys ready to work on

```sql
SELECT j.* FROM journeys j
WHERE j.project_id = $1
  AND j.can_parallelize = true
  AND (
    j.depends_on_journey_id IS NULL
    OR EXISTS (
      SELECT 1 FROM journeys dep
      WHERE dep.id = j.depends_on_journey_id
      AND dep.stage IN ('complete', 'deployed', 'approved')
    )
  )
ORDER BY j.sort_order;
```

### Complex dependencies via `journey_links`

For more complex dependency graphs, use `journey_links` with `depends_on` relationship.

---

## TypeScript Types

```typescript
// Journey types
export type JourneyType = 'bug' | 'feature' | 'feature_planning' | 'investigation';

// Stage types per journey type
export type FeaturePlanningStage = 'intake' | 'speccing' | 'ui_planning' | 'planning' | 'review' | 'approved';
export type FeatureStage = 'review_and_edit_plan' | 'implementing' | 'testing' | 'pre_prod_review' | 'merge_approved' | 'staging_qa' | 'deployed';
export type InvestigationStage = 'intake' | 'speccing' | 'planning' | 'approved' | 'in_progress' | 'complete';
export type BugStage = 'reported' | 'investigating' | 'fixing' | 'testing' | 'pre_prod_review' | 'merge_approved' | 'staging_qa' | 'deployed';

export type JourneyStage = FeaturePlanningStage | FeatureStage | InvestigationStage | BugStage;

// Target types
export type TargetType = 'backend' | 'web_frontend' | 'desktop' | 'mobile' | 'extension';

// Checklist item types
export type ChecklistItemType = 'deliverable' | 'test' | 'manual_check';

// Relationship types
export type JourneyRelationship = 'spawned_from' | 'blocks' | 'depends_on' | 'related_to';

// Session/process status
export type SessionStatus = 'active' | 'ended' | 'crashed' | 'abandoned';
export type ProcessStatus = 'running' | 'stopped' | 'crashed';

// Interfaces
export interface Journey {
  id: string;
  project_id: string;
  parent_journey_id: string | null;
  name: string;
  description: string | null;
  type: JourneyType;
  stage: JourneyStage;
  sort_order: number;
  source_url: string | null;
  tags: string[] | null;
  can_parallelize: boolean;
  depends_on_journey_id: string | null;
  branch_name: string | null;
  worktree_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectTarget {
  id: string;
  project_id: string;
  name: string;
  type: TargetType;
  path: string | null;
  start_command: string | null;
  default_port: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface JourneyIntake {
  id: string;
  journey_id: string;
  raw_content: string | null;
  refined_content: string | null;
  version: number;
  created_at: string;
}

export interface JourneySpec {
  id: string;
  journey_id: string;
  content: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface JourneyPlan {
  id: string;
  journey_id: string;
  content: Record<string, unknown> | null;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  text: string;
  type: ChecklistItemType;
  done: boolean;
  done_at?: string;
}

export interface JourneyChecklist {
  id: string;
  journey_id: string;
  leg_name: string;
  items: ChecklistItem[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface JourneyLink {
  from_journey_id: string;
  to_journey_id: string;
  relationship: JourneyRelationship;
  created_at: string;
}

export interface JourneySession {
  id: string;
  journey_id: string;
  checklist_id: string | null;
  editor: string | null;
  editor_workspace: string | null;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
}

export interface SessionProcess {
  id: string;
  session_id: string;
  target_id: string;
  pid: number | null;
  port: number | null;
  status: ProcessStatus;
  started_at: string;
  ended_at: string | null;
}

export interface SessionAiTool {
  id: string;
  session_id: string;
  ai_tool: string;
  session_identifier: string | null;
  target_id: string | null;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
}
```

---

## React Hooks

| Hook | Purpose |
|------|---------|
| `useJourneys(projectId)` | Updated for new fields, `updateStage()` method |
| `useProjectTargets(projectId)` | CRUD for project targets |
| `useJourneyIntakes(journeyId)` | Create/list intakes, trigger AI refinement |
| `useJourneySpecs(journeyId)` | Get/update spec |
| `useJourneyPlans(journeyId)` | Get/update plan |
| `useJourneyChecklists(journeyId)` | CRUD for checklists, toggle items |
| `useJourneyLinks(journeyId)` | Manage journey relationships |
| `useJourneySessions(journeyId)` | Session lifecycle management |

### AI Refinement Integration

```typescript
// In useJourneyIntakes
const createIntake = async (rawContent: string) => {
  // 1. Save raw intake
  const intake = await supabase.from('journey_intakes').insert({
    journey_id: journeyId,
    raw_content: rawContent,
    version: nextVersion
  });

  // 2. Call Claude CLI for refinement (async, in Electron only)
  if (window.electronAPI?.claude) {
    const refined = await window.electronAPI.claude.queryJson(
      buildIntakeRefinementPrompt(rawContent, projectContext),
      INTAKE_REFINEMENT_SCHEMA
    );

    // 3. Update with refined content
    await supabase.from('journey_intakes').update({
      refined_content: JSON.stringify(refined.data)
    }).eq('id', intake.id);
  }
};
```

---

## Files to Modify/Create

| File | Action |
|------|--------|
| `local-app/supabase/migrations/002_journey_enhancements.sql` | CREATE |
| `shared/src/types/index.ts` | MODIFY - Add all new types |
| `local-app/src/types/database.ts` | MODIFY - Add new table interfaces |
| `shared/src/hooks/useJourneys.ts` | MODIFY - Update for new fields |
| `shared/src/hooks/useProjectTargets.ts` | CREATE |
| `shared/src/hooks/useJourneyIntakes.ts` | CREATE |
| `shared/src/hooks/useJourneySpecs.ts` | CREATE |
| `shared/src/hooks/useJourneyPlans.ts` | CREATE |
| `shared/src/hooks/useJourneyChecklists.ts` | CREATE |
| `shared/src/hooks/useJourneyLinks.ts` | CREATE |
| `shared/src/hooks/useJourneySessions.ts` | CREATE |
| `shared/src/hooks/index.ts` | MODIFY - Export new hooks |

---

## Implementation Checklist

### Phase 1: Database Migration
- [x] Create migration file `local-app/supabase/migrations/002_journey_enhancements.sql`
  - [x] Add `project_targets` table
  - [x] Update `journeys` table (add new columns, drop old ones)
  - [x] Add `journey_intakes` table
  - [x] Add `journey_specs` table
  - [x] Add `journey_plans` table
  - [x] Add `journey_checklists` table
  - [x] Add `journey_links` table
  - [x] Add `journey_targets` table
  - [x] Add `journey_sessions` table
  - [x] Add `session_processes` table
  - [x] Add `session_ai_tools` table
  - [x] Add all indexes
  - [x] Add updated_at triggers
- [x] Run migration against Supabase

### Phase 2: TypeScript Types
- [x] Update `shared/src/types/index.ts`
  - [x] Add `JourneyType` type
  - [x] Add stage types (`FeaturePlanningStage`, `FeatureStage`, `InvestigationStage`, `BugStage`)
  - [x] Add `JourneyStage` union type
  - [x] Add `TargetType` type
  - [x] Add `ChecklistItemType` type
  - [x] Add `JourneyRelationship` type
  - [x] Add `SessionStatus` type
  - [x] Add `ProcessStatus` type
  - [x] Update `Journey` interface
  - [x] Add `ProjectTarget` interface
  - [x] Add `JourneyIntake` interface
  - [x] Add `JourneySpec` interface
  - [x] Add `JourneyPlan` interface
  - [x] Add `ChecklistItem` interface
  - [x] Add `JourneyChecklist` interface
  - [x] Add `JourneyLink` interface
  - [x] Add `JourneySession` interface
  - [x] Add `SessionProcess` interface
  - [x] Add `SessionAiTool` interface
  - [x] Add Insert/Update types for new tables
- [x] Update `local-app/src/types/database.ts` with new table interfaces

### Phase 3: React Hooks
- [x] Update `shared/src/hooks/useJourneys.ts`
  - [x] Update for new Journey fields
  - [x] Keep `startJourney` helper (still useful for setting branch/worktree)
  - [x] Add `updateStage(id, stage)` method
  - [x] Add `updateType(id, type)` method
  - [x] Add `updateSortOrder(id, sortOrder)` method
  - [x] Add `getReadyJourneys()` method
  - [x] Add `getChildJourneys(parentId)` method
- [x] Create `shared/src/hooks/useProjectTargets.ts`
- [x] Create `shared/src/hooks/useJourneyIntakes.ts`
  - [x] Basic CRUD
  - [ ] AI refinement integration (Electron only) - *deferred to Phase 5*
- [x] Create `shared/src/hooks/useJourneySpecs.ts`
- [x] Create `shared/src/hooks/useJourneyPlans.ts`
- [x] Create `shared/src/hooks/useJourneyChecklists.ts`
  - [x] CRUD for checklists
  - [x] Toggle item done/undone
  - [x] Set active checklist
  - [x] Add/remove items
  - [x] Get completion percentage
- [x] Create `shared/src/hooks/useJourneyLinks.ts`
- [x] Create `shared/src/hooks/useJourneySessions.ts`
  - [x] Session lifecycle management
  - [x] Process tracking (`useSessionProcesses`)
  - [x] AI tool tracking (`useSessionAiTools`)
- [x] Update `shared/src/hooks/index.ts` to export new hooks

### Phase 4: UI Updates
**Completed:**
- [x] Update journey list to show type/stage badges (`TypeBadge`, `StageBadge` components)
- [x] Add journey type selector on create (tabbed interface with 4 journey types)
- [x] Add stage transition UI (forward/backward stage buttons in detail panel)
- [x] Journey detail panel (slide-out panel with edit capability)
- [x] Quick intake form per journey type tab

**Pending:**
- [ ] **Intake Editor Tab** - Full intake editing with version history
  - [ ] Raw content textarea
  - [ ] AI refinement button (calls Claude CLI)
  - [ ] Version history viewer (show all intake versions)
  - [ ] Side-by-side raw vs refined view
- [ ] **Spec Tab** - Spec viewer/editor
  - [ ] Markdown editor for spec content
  - [ ] AI-assisted spec generation from refined intake
  - [ ] Version tracking
- [ ] **Plan Tab** - Implementation plan viewer/editor
  - [ ] Structured plan display (legs/steps)
  - [ ] AI-assisted plan generation from spec
  - [ ] Leg/step reordering
  - [ ] Edit individual steps
  - [ ] Time estimates per step
- [ ] **Checklists Tab** - Per-leg task management
  - [ ] Display checklists per leg
  - [ ] Toggle items done/undone
  - [ ] Progress percentage display
  - [ ] Typed items (deliverable, test, manual_check) with icons
  - [ ] Add/remove items inline
- [ ] **Derivative Journeys** - Parent/child journey relationships
  - [ ] Show child journeys in parent's detail panel
  - [ ] "Spawn Feature Journey" button on approved Feature Planning
  - [ ] Link indicator on spawned journeys
  - [ ] Breadcrumb navigation to parent
- [ ] **Journey Links** - Relationship management
  - [ ] Display related journeys (blocks, depends_on, related_to)
  - [ ] Add/remove links between journeys
  - [ ] Dependency graph visualization (optional)
- [ ] **Session Management Panel**
  - [ ] Show active/past sessions
  - [ ] Display running processes per session
  - [ ] AI tool usage tracking
  - [ ] Session notes
- [ ] **Project Targets Configuration**
  - [ ] Add/edit/remove project targets
  - [ ] Configure start commands per target
  - [ ] Port allocation
- [ ] **Drag-to-reorder for journeys** - Manual sorting
- [ ] **Journey Filters** - Filter by stage, tag, has-blockers
- [ ] **Bulk Stage Updates** - Move multiple journeys to next stage

### Phase 5: Claude CLI Integration
**Completed:**
- [x] Add intake refinement prompt (`buildIntakeRefinementPrompt`)
- [x] Add spec generation prompt (`buildSpecGenerationPrompt`)
- [x] Add plan generation prompt (`buildPlanGenerationPrompt`)
- [x] IPC handlers for all AI operations
- [x] Preload API exposure for renderer
- [x] **Project intake AI refinement** (`buildProjectIntakeRefinementPrompt`, `buildProjectIntakeUpdatePrompt`)
- [x] Project intake IPC handlers (`claude:refineProjectIntake`, `claude:analyzeProjectIntakeChanges`)
- [x] Project intake UI (ProjectIntakeEditor, IntakeChangesDialog, ProjectDetailModal)

**Pending:**
- [ ] Wire up AI refinement in journey intake editor UI
- [ ] Wire up spec generation in spec tab UI
- [ ] Wire up plan generation in plan tab UI
- [ ] Add loading states/spinners for AI operations
- [ ] Add error handling UI for failed AI calls
- [ ] Streaming response support (show AI output as it generates)

### Phase 5b: Project Intake Feature ✅ COMPLETE
**Database:**
- [x] Migration `003_project_intake.sql`
- [x] Add `raw_intake`, `raw_intake_previous`, `ai_parsed_intake`, `ai_parsed_at`, `intake_updated_at` columns

**Types:**
- [x] Update Project interface in `shared/src/types/index.ts`
- [x] Update ProjectInsert and ProjectUpdate types

**AI Prompts:**
- [x] `buildProjectIntakeRefinementPrompt()` - sections: Overview → Goals → Features → Constraints → Tech → Architecture
- [x] `buildProjectIntakeUpdatePrompt()` - diff analysis with changes summary

**IPC:**
- [x] `claude:refineProjectIntake` handler
- [x] `claude:analyzeProjectIntakeChanges` handler
- [x] Update preload.ts with new API methods

**Hooks:**
- [x] Add `refineProjectIntake()` and `analyzeProjectIntakeChanges()` to claudeCliStore
- [x] Add `useProjectIntakeAI()` hook in useClaudeCli.ts

**Local App UI:**
- [x] `ProjectIntakeEditor.tsx` - tabbed Raw/AI interface with AI generation
- [x] `IntakeChangesDialog.tsx` - diff dialog for update decisions
- [x] `ProjectDetailModal.tsx` - full project detail view
- [x] Update `ProjectCard.tsx` - add onSelect and intake status indicator
- [x] Update `ProjectsTab.tsx` - integrate ProjectDetailModal

**Web App UI:**
- [x] `ProjectIntakeEditor.tsx` - simpler version (no AI)
- [x] `ProjectDetailPanel.tsx` - side panel view
- [x] Update `ProjectCard.tsx` - add intake status indicator
- [x] Update `ProjectsTab.tsx` - split view with detail panel

### Phase 5c: Project Tabs in Journeys ✅ COMPLETE
- [x] Update `local-app/src/components/journeys/JourneysTab.tsx`
  - [x] Change to `selectedProjectId` state with auto-select first project
  - [x] Add project tabs at top of view
  - [x] Move journey type tabs below project tabs
  - [x] Add horizontal scroll for many projects
- [x] Update `web-app/src/components/journeys/JourneysTab.tsx`
  - [x] Same changes as local-app version

### Phase 6: Session & Process Management (Future)
- [ ] Start/stop dev server processes per target
- [ ] Port allocation per worktree
- [ ] Process health monitoring
- [ ] Auto-restart crashed processes
- [ ] Terminal output capture

### Phase 7: Git Worktree Integration (Future)
- [ ] Add button to create/find worktree on journey (should move it into implementation)
- [ ] Add button to delete worktree on journey
- [ ] Worktree status display
- [ ] Branch conflict detection

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| `sort_order` as REAL | Allows fractional positioning for drag-and-drop without reindexing |
| `stage` replaces `status` | Type-specific stages provide granular workflow tracking |
| Intakes are versioned | Preserve history, each save creates new version with AI refinement |
| Checklist items are typed | `deliverable`, `test`, `manual_check` for different verification needs |
| Sessions support multiple AI tools | Future-proof for Claude Code, Cursor, Copilot, Windsurf, etc. |
| Processes tracked per target | Flexible for any project structure (not just rails + react) |
| `depends_on_journey_id` + `journey_links` | Simple case on journey, complex dependencies via links table |

---

## Appendix: Claude CLI Service

The Claude CLI wrapper service (already built) provides:

- `analyzeJourney(description, projectContext)` → JourneyAnalysis
- `createPlan(featureDescription, techStack, existingStructure)` → ImplementationPlan
- `summarizeJourney(journeyName, gitDiff, commitHistory, originalPlan)` → JourneySummary
- `queryJson<T>(prompt, jsonSchema)` → Structured JSON responses
- `refineIntake(rawIntake, journeyType, projectContext)` → RefinedIntake
- `generateSpec(refinedIntake, projectContext, techStack)` → Spec
- `generatePlan(spec, projectContext)` → Plan

Location: `local-app/electron/services/claude-cli/`

This service turns your Claude Max subscription into a local API for AI-powered features.

---

## Appendix: VS Code + Claude Code Launcher Service

✅ **Implemented December 2024**

Opens VS Code at a journey's worktree and automatically sends a contextual prompt to Claude Code using VS Code's `code chat` CLI command.

### Key Discovery
VS Code has a built-in chat command:
```bash
code chat "Your prompt" --mode agent --reuse-window
```

### API
- `vscode.getStatus()` → Check if VS Code is installed
- `vscode.launch(options)` → Open VS Code with optional Claude prompt
- `vscode.launchForJourney(request)` → Open VS Code with contextual prompt based on journey type/stage
- `vscode.generatePrompt(type, context)` → Generate prompt without launching

### Contextual Prompts
Prompts are generated based on journey type and stage:
- **feature_planning**: Spec/planning prompts (intake, speccing, planning, review, approved)
- **feature**: Implementation prompts (implementing, testing, pre_prod_review, etc.)
- **bug**: Investigation and fix prompts (reported, investigating, fixing)
- **investigation**: Research prompts (in_progress, complete)

### Flow
1. User clicks "VS Code" button on a started journey
2. Service detects VS Code installation path
3. Opens VS Code in a new window at the worktree path
4. After 2s delay, sends `code chat "<prompt>" --mode agent --reuse-window`
5. Claude Code opens with the contextual prompt

### Location
- Service: `local-app/electron/services/vscode-launcher/`
- IPC: `local-app/electron/ipc/vscode-launcher.ipc.ts`
- UI: "VS Code" button on JourneyCard (only shown for started journeys)

---

## Phase 4 UI Implementation Roadmap

### Build Order & Dependencies

The journey detail panel needs to be refactored from a single-pane view into a **tabbed interface with 6 tabs**. Build in this order:

| Priority | Tab | Complexity | Est. Effort | Dependencies |
|----------|-----|------------|-------------|--------------|
| 1 | **Overview** | Low | 1 hour | Already done - extract from current panel |
| 2 | **Intake** | Medium | 4-6 hours | Follow `ProjectIntakeEditor` pattern |
| 3 | **Spec** | Medium | 3-4 hours | Depends on Intake existing |
| 4 | **Checklists** | Medium-High | 4-6 hours | Independent - can build in parallel |
| 5 | **Plan** | High | 6-8 hours | Depends on Spec existing |
| 6 | **Links** | High | 4-6 hours | Independent - needs journey picker modal |

**Total estimated effort**: ~25-35 hours

### Why This Order?

1. **Overview first**: Extract existing content, establish tabbed pattern
2. **Intake second**: Closest pattern to existing `ProjectIntakeEditor`, builds confidence
3. **Spec third**: Similar to Intake, generates from Intake content
4. **Checklists fourth**: Self-contained, most user value for tracking work
5. **Plan fifth**: Most complex structure, generates from Spec
6. **Links last**: Requires journey picker UI, less critical for MVP

---

## Component Architecture

### Container Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  JourneyDetailPanel (container)                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Header ──────────────────────────────────────────────────┐  │
│  │  Journey Name                                    [✕ Close] │  │
│  │  📋 Feature Planning • Stage: speccing                     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ TabNavigation ────────────────────────────────────────────┐  │
│  │  [Overview] [Intake] [Spec] [Plan] [Checklists] [Links]    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ TabContent (conditional render) ──────────────────────────┐  │
│  │                                                             │  │
│  │  Content changes based on active tab...                     │  │
│  │                                                             │  │
│  │                                                             │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ ActionsFooter (shared across all tabs) ───────────────────┐  │
│  │  [← Previous Stage]  [Next Stage →]  [VS Code]  [Delete]   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Shared Components to Extract

| Component | Purpose | Reused From |
|-----------|---------|-------------|
| `TabNavigation` | Tab bar with active state | `ProjectIntakeEditor` pattern |
| `MarkdownEditor` | Textarea with optional preview | New shared component |
| `AIGenerateButton` | Button with loading spinner | `ProjectIntakeEditor` pattern |
| `VersionSelector` | Dropdown for version history | New for Intake tab |
| `EmptyState` | Consistent "no content" UI | Common component |

### State Management

- Each tab component manages its own local state
- Use existing shared hooks (`useJourneyIntakes`, `useJourneySpec`, etc.)
- AI operations via `useClaudeCli` hook from `local-app/src/hooks/useClaudeCli.ts`
- Active tab stored in `JourneyDetailPanel` local state

---

## File Structure

### Local App Components

```
local-app/src/components/journeys/
├── JourneyDetailPanel.tsx        # REFACTOR: Add tab routing
├── detail-tabs/                  # NEW FOLDER
│   ├── index.ts                  # Export all tabs
│   ├── TabNavigation.tsx         # Shared tab bar
│   ├── OverviewTab.tsx           # Extract from current panel
│   ├── IntakeTab.tsx             # Raw + refined intake
│   ├── SpecTab.tsx               # Markdown spec editor
│   ├── PlanTab.tsx               # Structured plan viewer/editor
│   ├── ChecklistsTab.tsx         # Per-leg checklists
│   └── LinksTab.tsx              # Journey relationships
└── modals/                       # NEW FOLDER
    └── JourneyPickerModal.tsx    # For adding links
```

### Web App Components

Same structure, but simplified (no AI generation buttons):

```
web-app/src/components/journeys/
├── JourneyDetailPanel.tsx        # REFACTOR: Add tab routing
└── detail-tabs/                  # NEW FOLDER
    ├── index.ts
    ├── TabNavigation.tsx
    ├── OverviewTab.tsx
    ├── IntakeTab.tsx             # Read-only, no AI
    ├── SpecTab.tsx               # Read-only, no AI
    ├── PlanTab.tsx               # Read-only
    ├── ChecklistsTab.tsx         # Full functionality
    └── LinksTab.tsx              # Full functionality
```

### Difference Between Apps

| Feature | Local App | Web App |
|---------|-----------|---------|
| AI "Generate" buttons | ✅ Yes | ❌ No |
| Edit content | ✅ Yes | ✅ Yes (auto-save) |
| Version history | ✅ Yes | ✅ Yes |
| Checklists toggle | ✅ Yes | ✅ Yes |
| VS Code launch | ✅ Yes | ❌ No |

---

## AI Integration Wiring

### Existing Infrastructure

| Layer | File | What's There |
|-------|------|--------------|
| **Prompts** | `local-app/electron/services/claude-cli/prompts.ts` | `buildIntakeRefinementPrompt()`, `buildSpecGenerationPrompt()`, `buildPlanGenerationPrompt()` |
| **IPC Handlers** | `local-app/electron/ipc/claude-cli.ipc.ts` | Handlers for `claude:refineIntake`, `claude:generateSpec`, `claude:generatePlan` |
| **Preload** | `local-app/electron/preload.ts` | API exposed to renderer |
| **Store** | `local-app/src/stores/claudeCliStore.ts` | Zustand store for AI state |

### Missing React Hooks (To Create)

Add to `local-app/src/hooks/useClaudeCli.ts`:

```typescript
// Journey Intake AI refinement
export function useJourneyIntakeAI() {
  const { isProcessing, lastError, setProcessing, setError } = useClaudeCli()

  const refineIntake = useCallback(
    async (rawIntake: string, journeyType: JourneyType, projectContext?: string) => {
      setProcessing(true)
      try {
        const result = await window.electronAPI.claude.refineIntake({
          rawIntake,
          journeyType,
          projectContext
        })
        return result
      } catch (err) {
        setError(err as Error)
        return null
      } finally {
        setProcessing(false)
      }
    },
    [setProcessing, setError]
  )

  return { refineIntake, isProcessing, error: lastError }
}

// Spec generation
export function useSpecGeneration() {
  // Similar pattern...
  const generateSpec = useCallback(async (refinedIntake: string, projectContext: string) => {
    // Call window.electronAPI.claude.generateSpec(...)
  }, [])
  return { generateSpec, isProcessing, error }
}

// Plan generation
export function usePlanGeneration() {
  // Similar pattern...
  const generatePlan = useCallback(async (spec: string, projectContext: string) => {
    // Call window.electronAPI.claude.generatePlan(...)
  }, [])
  return { generatePlan, isProcessing, error }
}
```

### UI Button Pattern

Follow `ProjectIntakeEditor.tsx` pattern:

```tsx
// In IntakeTab.tsx
const { refineIntake, isProcessing, error } = useJourneyIntakeAI()

const handleGenerateRefinement = async () => {
  const result = await refineIntake(rawContent, journey.type, projectContext)
  if (result?.data) {
    await createIntake(rawContent, JSON.stringify(result.data))
    toast.success('Intake refined successfully')
  }
}

<Button
  onClick={handleGenerateRefinement}
  disabled={isProcessing || !rawContent.trim()}
>
  {isProcessing ? (
    <>
      <Spinner className="mr-2" />
      Refining...
    </>
  ) : (
    '🤖 Refine with AI'
  )}
</Button>
```

---

## Migration Path

### Step-by-Step Refactor

**Step 1: Create folder structure**
```bash
mkdir -p local-app/src/components/journeys/detail-tabs
mkdir -p local-app/src/components/journeys/modals
mkdir -p web-app/src/components/journeys/detail-tabs
```

**Step 2: Create TabNavigation component**
- Copy pattern from `ProjectIntakeEditor` tab buttons
- Make it generic with `tabs` prop and `activeTab` state

**Step 3: Extract OverviewTab**
- Move current `JourneyDetailPanel` content (name, description, stage progress, etc.)
- Keep in same file initially, then extract

**Step 4: Refactor JourneyDetailPanel**
- Add `activeTab` state
- Add `TabNavigation` above content
- Conditionally render tab content
- Keep `ActionsFooter` at bottom (always visible)

**Step 5: Build remaining tabs one at a time**
- Follow build order: Intake → Spec → Checklists → Plan → Links
- Each tab uses its corresponding hook from `shared/src/hooks/`

---

## Testing Strategy

### Unit Tests Per Component

| Component | Key Test Cases |
|-----------|----------------|
| `TabNavigation` | Renders all 6 tabs, highlights active, calls `onChange` |
| `OverviewTab` | Displays journey data, editable fields work, stage buttons work |
| `IntakeTab` | Shows versions list, creates new intake, saves raw content, AI button state |
| `SpecTab` | Displays markdown, saves on blur, AI generate button |
| `PlanTab` | Renders leg structure, handles empty state, add/remove legs |
| `ChecklistsTab` | Toggles items, shows progress %, add/remove items |
| `LinksTab` | Shows relationships by type, add/remove links |

### Integration Test Scenarios

1. **Full Journey Workflow**
   - Create journey → Add intake → Generate spec → Generate plan → Create checklists
   - Verify data persists across tab switches

2. **AI Generation Flow**
   - Mock IPC handlers
   - Verify loading states during generation
   - Verify error handling on failure
   - Verify success updates UI

3. **Cross-Tab Data Consistency**
   - Edit in one tab, switch tabs, verify data shows correctly
   - Verify refetch on tab switch if stale

### Manual QA Checklist

- [ ] Navigate between all 6 tabs smoothly
- [ ] Create journey, add raw intake
- [ ] Trigger AI refinement, verify refined content appears
- [ ] Generate spec from intake
- [ ] Generate plan from spec (verify structured output)
- [ ] Create checklists per leg
- [ ] Toggle checklist items, verify progress updates
- [ ] Add links to other journeys
- [ ] Test empty states for each tab
- [ ] Test error states (disconnect AI, network error)
- [ ] Verify web app works (read-only AI features)
- [ ] Test on both local app and web app
