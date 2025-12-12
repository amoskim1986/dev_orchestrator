# Enhanced Journey Schema & Multi-Target Projects

> **Status**: Planning Complete
> **Created**: 2024-12-12
> **Scope**: Database schema expansion, TypeScript types, React hooks

---

## Overview

This document outlines the expanded database schema to support:

1. **Journey Types** with type-specific stages (feature_planning, feature, bug, investigation)
2. **Journey Hierarchy** (parent/child relationships)
3. **Intake Versioning** with AI refinement
4. **Multi-Target Projects** (rails, web, electron, mobile, chrome extension, etc.)
5. **Session Tracking** with multiple AI tools (Claude Code, Cursor, Copilot, etc.)
6. **Parallelization Support** for concurrent journey execution

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
- [ ] Run migration against Supabase

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

### Phase 4: UI Updates (Future)
- [ ] Update journey list to show type/stage badges
- [ ] Add journey type selector on create
- [ ] Add stage transition UI
- [ ] Add intake editor with AI refinement
- [ ] Add spec/plan viewers
- [ ] Add checklist UI with typed items
- [ ] Add session management panel
- [ ] Add project targets configuration
- [ ] Add drag-to-reorder for journeys

### Phase 5: Claude CLI Integration (Future)
- [ ] Add intake refinement prompt
- [ ] Add spec generation prompt
- [ ] Add plan generation prompt
- [ ] Wire up AI refinement in `useJourneyIntakes`
- [ ] Add loading states for AI operations

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

Location: `local-app/electron/services/claude-cli/`

This service turns your Claude Max subscription into a local API for AI-powered features.
