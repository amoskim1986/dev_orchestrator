// =============================================================================
// JOURNEY TYPES & STAGES
// =============================================================================

export type JourneyType = 'bug' | 'feature' | 'feature_planning' | 'investigation';

// Stage types per journey type
export type FeaturePlanningStage = 'intake' | 'speccing' | 'ui_planning' | 'planning' | 'review' | 'approved';
export type FeatureStage = 'review_and_edit_plan' | 'implementing' | 'testing' | 'pre_prod_review' | 'merge_approved' | 'staging_qa' | 'deployed';
export type InvestigationStage = 'intake' | 'speccing' | 'planning' | 'approved' | 'in_progress' | 'complete';
export type BugStage = 'reported' | 'investigating' | 'fixing' | 'testing' | 'pre_prod_review' | 'merge_approved' | 'staging_qa' | 'deployed';

export type JourneyStage = FeaturePlanningStage | FeatureStage | InvestigationStage | BugStage;

// Legacy status type (for backward compatibility during migration)
export type JourneyStatus = 'planning' | 'in_progress' | 'ready' | 'deployed';

// =============================================================================
// TARGET TYPES
// =============================================================================

export type TargetType = 'backend' | 'web_frontend' | 'desktop' | 'mobile' | 'extension';

// =============================================================================
// CHECKLIST & RELATIONSHIP TYPES
// =============================================================================

export type ChecklistItemType = 'deliverable' | 'test' | 'manual_check';

export interface ChecklistItem {
  text: string;
  type: ChecklistItemType;
  done: boolean;
  done_at?: string;
}

export type JourneyRelationship = 'spawned_from' | 'blocks' | 'depends_on' | 'related_to';

// =============================================================================
// SESSION & PROCESS TYPES
// =============================================================================

export type SessionStatus = 'active' | 'ended' | 'crashed' | 'abandoned';
export type ProcessStatus = 'running' | 'stopped' | 'crashed';

// =============================================================================
// DATABASE ROW TYPES
// =============================================================================

export interface Project {
  id: string;
  name: string;
  root_path: string;
  frontend_path: string | null;
  backend_path: string | null;
  frontend_start_cmd: string;
  backend_start_cmd: string;
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

export interface JourneyTarget {
  journey_id: string;
  target_id: string;
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

// =============================================================================
// INSERT TYPES (id and timestamps auto-generated)
// =============================================================================

export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'updated_at'> & {
  frontend_path?: string | null;
  backend_path?: string | null;
  frontend_start_cmd?: string;
  backend_start_cmd?: string;
};

export type ProjectTargetInsert = {
  project_id: string;
  name: string;
  type: TargetType;
  path?: string | null;
  start_command?: string | null;
  default_port?: number | null;
  sort_order?: number;
};

export type JourneyInsert = {
  project_id: string;
  name: string;
  parent_journey_id?: string | null;
  description?: string | null;
  type?: JourneyType;
  stage?: JourneyStage;
  sort_order?: number;
  source_url?: string | null;
  tags?: string[] | null;
  can_parallelize?: boolean;
  depends_on_journey_id?: string | null;
  branch_name?: string | null;
  worktree_path?: string | null;
};

export type JourneyIntakeInsert = {
  journey_id: string;
  raw_content?: string | null;
  refined_content?: string | null;
  version?: number;
};

export type JourneySpecInsert = {
  journey_id: string;
  content?: string | null;
  version?: number;
};

export type JourneyPlanInsert = {
  journey_id: string;
  content?: Record<string, unknown> | null;
  ai_generated?: boolean;
};

export type JourneyChecklistInsert = {
  journey_id: string;
  leg_name: string;
  items?: ChecklistItem[];
  is_active?: boolean;
  sort_order?: number;
};

export type JourneyLinkInsert = {
  from_journey_id: string;
  to_journey_id: string;
  relationship: JourneyRelationship;
};

export type JourneyTargetInsert = {
  journey_id: string;
  target_id: string;
};

export type JourneySessionInsert = {
  journey_id: string;
  checklist_id?: string | null;
  editor?: string | null;
  editor_workspace?: string | null;
  status?: SessionStatus;
  notes?: string | null;
};

export type SessionProcessInsert = {
  session_id: string;
  target_id: string;
  pid?: number | null;
  port?: number | null;
  status?: ProcessStatus;
};

export type SessionAiToolInsert = {
  session_id: string;
  ai_tool: string;
  session_identifier?: string | null;
  target_id?: string | null;
  notes?: string | null;
};

// =============================================================================
// UPDATE TYPES (all fields optional)
// =============================================================================

export type ProjectUpdate = Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>;
export type ProjectTargetUpdate = Partial<Omit<ProjectTarget, 'id' | 'project_id' | 'created_at' | 'updated_at'>>;
export type JourneyUpdate = Partial<Omit<Journey, 'id' | 'project_id' | 'created_at' | 'updated_at'>>;
export type JourneyIntakeUpdate = Partial<Omit<JourneyIntake, 'id' | 'journey_id' | 'created_at'>>;
export type JourneySpecUpdate = Partial<Omit<JourneySpec, 'id' | 'journey_id' | 'created_at' | 'updated_at'>>;
export type JourneyPlanUpdate = Partial<Omit<JourneyPlan, 'id' | 'journey_id' | 'created_at' | 'updated_at'>>;
export type JourneyChecklistUpdate = Partial<Omit<JourneyChecklist, 'id' | 'journey_id' | 'created_at' | 'updated_at'>>;
export type JourneySessionUpdate = Partial<Omit<JourneySession, 'id' | 'journey_id' | 'started_at'>>;
export type SessionProcessUpdate = Partial<Omit<SessionProcess, 'id' | 'session_id' | 'target_id' | 'started_at'>>;
export type SessionAiToolUpdate = Partial<Omit<SessionAiTool, 'id' | 'session_id' | 'started_at'>>;

// =============================================================================
// HELPER TYPES
// =============================================================================

// Stage validators per journey type
export const FEATURE_PLANNING_STAGES: FeaturePlanningStage[] = ['intake', 'speccing', 'ui_planning', 'planning', 'review', 'approved'];
export const FEATURE_STAGES: FeatureStage[] = ['review_and_edit_plan', 'implementing', 'testing', 'pre_prod_review', 'merge_approved', 'staging_qa', 'deployed'];
export const INVESTIGATION_STAGES: InvestigationStage[] = ['intake', 'speccing', 'planning', 'approved', 'in_progress', 'complete'];
export const BUG_STAGES: BugStage[] = ['reported', 'investigating', 'fixing', 'testing', 'pre_prod_review', 'merge_approved', 'staging_qa', 'deployed'];

// Get valid stages for a journey type
export function getStagesForType(type: JourneyType): JourneyStage[] {
  switch (type) {
    case 'feature_planning': return FEATURE_PLANNING_STAGES;
    case 'feature': return FEATURE_STAGES;
    case 'investigation': return INVESTIGATION_STAGES;
    case 'bug': return BUG_STAGES;
  }
}

// Get initial stage for a journey type
export function getInitialStage(type: JourneyType): JourneyStage {
  switch (type) {
    case 'feature_planning': return 'intake';
    case 'feature': return 'review_and_edit_plan';
    case 'investigation': return 'intake';
    case 'bug': return 'reported';
  }
}
