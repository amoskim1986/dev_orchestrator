-- Dev Orchestrator Initial Schema
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query

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

-- journeys table
-- branch_name and worktree_path are NULL until journey is started
CREATE TABLE journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  branch_name TEXT,              -- NULL in planning, set when started
  worktree_path TEXT,            -- NULL in planning, set when started
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'ready', 'deployed')),
  rails_port INTEGER,
  react_port INTEGER,
  rails_pid INTEGER,
  react_pid INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_journeys_project ON journeys(project_id);
CREATE INDEX idx_journeys_status ON journeys(status);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER journeys_updated_at
  BEFORE UPDATE ON journeys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS disabled since we're using service_role key
-- Tables are only accessible with the service_role key
