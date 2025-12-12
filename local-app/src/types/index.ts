// Re-export all types from shared package
export type {
  // Base types
  JourneyStatus,
  JourneyType,
  JourneyStage,
  TargetType,
  ChecklistItemType,
  JourneyRelationship,
  SessionStatus,
  ProcessStatus,

  // Main entity types
  Project,
  Journey,
  ProjectTarget,
  JourneyIntake,
  JourneySpec,
  JourneyPlan,
  JourneyChecklist,
  JourneyLink,
  JourneyTarget,
  JourneySession,
  SessionProcess,
  SessionAiTool,
  ChecklistItem,

  // Insert types
  ProjectInsert,
  ProjectTargetInsert,
  JourneyInsert,
  JourneyIntakeInsert,
  JourneySpecInsert,
  JourneyPlanInsert,
  JourneyChecklistInsert,
  JourneyLinkInsert,
  JourneyTargetInsert,
  JourneySessionInsert,
  SessionProcessInsert,
  SessionAiToolInsert,

  // Update types
  ProjectUpdate,
  ProjectTargetUpdate,
  JourneyUpdate,
  JourneyIntakeUpdate,
  JourneySpecUpdate,
  JourneyPlanUpdate,
  JourneyChecklistUpdate,
  JourneySessionUpdate,
  SessionProcessUpdate,
  SessionAiToolUpdate,
} from '@dev-orchestrator/shared';

// Re-export constants and helpers
export {
  FEATURE_PLANNING_STAGES,
  FEATURE_STAGES,
  INVESTIGATION_STAGES,
  BUG_STAGES,
  getStagesForType,
  getInitialStage,
} from '@dev-orchestrator/shared';
