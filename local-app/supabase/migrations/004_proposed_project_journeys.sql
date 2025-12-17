-- Migration: Add proposed_project_journeys JSONB column to projects table
-- Stores AI-generated journey proposals based on project intake
--
-- Each proposal in the array has:
--   id: string (uuid)
--   name: string
--   description: string
--   early_plan: string
--   status: 'draft' | 'generated' | 'rejected' | 'punted' | 'cancelled' | 'already_completed'
--   generated_journey_id: string | null (references journeys.id when generated)
--   sort_order: number
--   created_at: timestamp
--   updated_at: timestamp
--   cancelled_at: timestamp | null
--
-- Status meanings:
--   draft: Newly proposed, awaiting action
--   generated: A journey was created from this proposal
--   rejected: User explicitly rejected this proposal
--   punted: User deferred this proposal for later
--   cancelled: Proposal was cancelled (orphaned journey reference)
--   already_completed: User marked this as already done (pre-existing implementation)

ALTER TABLE projects
ADD COLUMN proposed_project_journeys JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN projects.proposed_project_journeys IS
  'AI-generated journey proposals stored as JSONB array. Each proposal tracks status (draft/generated/rejected/cancelled) and links to created journey via generated_journey_id.';
