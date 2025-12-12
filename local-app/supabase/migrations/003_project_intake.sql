-- Migration: Add project intake fields for AI refinement feature
-- This adds raw intake and AI-parsed intake columns to projects table

ALTER TABLE projects
ADD COLUMN raw_intake TEXT,
ADD COLUMN raw_intake_previous TEXT,
ADD COLUMN ai_parsed_intake TEXT,
ADD COLUMN ai_parsed_at TIMESTAMPTZ,
ADD COLUMN intake_updated_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN projects.raw_intake IS 'Raw user-entered intake text for the project';
COMMENT ON COLUMN projects.raw_intake_previous IS 'Previous version of raw intake for diff comparison';
COMMENT ON COLUMN projects.ai_parsed_intake IS 'AI-refined/parsed version of the intake';
COMMENT ON COLUMN projects.ai_parsed_at IS 'Timestamp when AI parsing was last performed';
COMMENT ON COLUMN projects.intake_updated_at IS 'Timestamp when intake content was last modified';
