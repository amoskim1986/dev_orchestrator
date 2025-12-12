-- Migration: Enhanced Journey Schema
-- Description: Add journey types, stages, multi-target projects, session tracking
-- Date: 2024-12-12

-- =============================================================================
-- 1. PROJECT TARGETS
-- Define what targets a project has (rails, web, electron, mobile, etc.)
-- =============================================================================

CREATE TABLE project_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,              -- 'rails', 'web', 'electron', 'mobile', 'chrome_ext'
  type TEXT NOT NULL CHECK (type IN ('backend', 'web_frontend', 'desktop', 'mobile', 'extension')),
  path TEXT,                       -- relative path within project
  start_command TEXT,              -- 'bin/rails server', 'npm run dev'
  default_port INT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, name)
);

CREATE INDEX idx_project_targets_project ON project_targets(project_id);

-- =============================================================================
-- 2. UPDATE JOURNEYS TABLE
-- Add new columns for types, stages, hierarchy, parallelization
-- =============================================================================

-- Add new columns
ALTER TABLE journeys ADD COLUMN parent_journey_id UUID REFERENCES journeys(id) ON DELETE SET NULL;
ALTER TABLE journeys ADD COLUMN type TEXT DEFAULT 'feature' CHECK (type IN ('bug', 'feature', 'feature_planning', 'investigation'));
ALTER TABLE journeys ADD COLUMN stage TEXT DEFAULT 'intake';
ALTER TABLE journeys ADD COLUMN sort_order REAL DEFAULT 0;
ALTER TABLE journeys ADD COLUMN source_url TEXT;
ALTER TABLE journeys ADD COLUMN tags TEXT[];
ALTER TABLE journeys ADD COLUMN can_parallelize BOOLEAN DEFAULT true;
ALTER TABLE journeys ADD COLUMN depends_on_journey_id UUID REFERENCES journeys(id) ON DELETE SET NULL;

-- Migrate existing status to stage
UPDATE journeys SET stage = CASE
  WHEN status = 'planning' THEN 'intake'
  WHEN status = 'in_progress' THEN 'implementing'
  WHEN status = 'ready' THEN 'testing'
  WHEN status = 'deployed' THEN 'deployed'
  ELSE 'intake'
END;

-- Drop old columns (after migrating data)
ALTER TABLE journeys DROP COLUMN status;
ALTER TABLE journeys DROP COLUMN rails_port;
ALTER TABLE journeys DROP COLUMN react_port;
ALTER TABLE journeys DROP COLUMN rails_pid;
ALTER TABLE journeys DROP COLUMN react_pid;

-- Add indexes for new columns
CREATE INDEX idx_journeys_parent ON journeys(parent_journey_id);
CREATE INDEX idx_journeys_type ON journeys(type);
CREATE INDEX idx_journeys_stage ON journeys(stage);
CREATE INDEX idx_journeys_depends_on ON journeys(depends_on_journey_id);

-- =============================================================================
-- 3. JOURNEY INTAKES
-- Versioned raw intakes with AI refinement
-- =============================================================================

CREATE TABLE journey_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  raw_content TEXT,
  refined_content TEXT,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_journey_intakes_journey ON journey_intakes(journey_id);

-- =============================================================================
-- 4. JOURNEY SPECS
-- The refined "what" document
-- =============================================================================

CREATE TABLE journey_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE UNIQUE,
  content TEXT,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 5. JOURNEY PLANS
-- The "how" - implementation plan
-- =============================================================================

CREATE TABLE journey_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE UNIQUE,
  content JSONB,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 6. JOURNEY CHECKLISTS
-- Per-leg task lists with typed items
-- =============================================================================

CREATE TABLE journey_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  leg_name TEXT NOT NULL,
  items JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_journey_checklists_journey ON journey_checklists(journey_id);
CREATE INDEX idx_journey_checklists_active ON journey_checklists(is_active) WHERE is_active = true;

-- =============================================================================
-- 7. JOURNEY LINKS
-- Flexible relationships between journeys
-- =============================================================================

CREATE TABLE journey_links (
  from_journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  to_journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL CHECK (relationship IN ('spawned_from', 'blocks', 'depends_on', 'related_to')),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (from_journey_id, to_journey_id, relationship)
);

CREATE INDEX idx_journey_links_from ON journey_links(from_journey_id);
CREATE INDEX idx_journey_links_to ON journey_links(to_journey_id);

-- =============================================================================
-- 8. JOURNEY TARGETS
-- Which targets a journey affects
-- =============================================================================

CREATE TABLE journey_targets (
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES project_targets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (journey_id, target_id)
);

-- =============================================================================
-- 9. JOURNEY SESSIONS
-- Session lifecycle tracking (many per journey)
-- =============================================================================

CREATE TABLE journey_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  checklist_id UUID REFERENCES journey_checklists(id) ON DELETE SET NULL,
  editor TEXT,
  editor_workspace TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'crashed', 'abandoned')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_journey_sessions_journey ON journey_sessions(journey_id);
CREATE INDEX idx_journey_sessions_active ON journey_sessions(status) WHERE status = 'active';

-- =============================================================================
-- 10. SESSION PROCESSES
-- Running processes per session per target
-- =============================================================================

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

-- =============================================================================
-- 11. SESSION AI TOOLS
-- AI tools used per session (supports multiple simultaneously)
-- =============================================================================

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

-- =============================================================================
-- 12. TRIGGERS FOR updated_at
-- =============================================================================

-- Reuse existing update_updated_at function from migration 001
CREATE TRIGGER update_project_targets_updated_at
  BEFORE UPDATE ON project_targets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_journey_specs_updated_at
  BEFORE UPDATE ON journey_specs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_journey_plans_updated_at
  BEFORE UPDATE ON journey_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_journey_checklists_updated_at
  BEFORE UPDATE ON journey_checklists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
