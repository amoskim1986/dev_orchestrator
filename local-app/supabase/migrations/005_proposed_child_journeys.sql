-- Migration: Add proposed_child_journeys to journeys table
-- This column stores proposed child journeys for feature_planning type journeys
-- Similar to proposed_project_journeys on projects table

-- Add JSONB column for proposed child journeys
ALTER TABLE journeys
ADD COLUMN IF NOT EXISTS proposed_child_journeys JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN journeys.proposed_child_journeys IS 'Stores proposed child journeys for feature_planning journeys. Each entry contains: id, name, description, early_plan, checklist_items, status, generated_journey_id, sort_order, timestamps';
