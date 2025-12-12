// Re-export all types from shared package
export type {
  JourneyStatus,
  JourneyType,
  JourneyStage,
  Project,
  Journey,
  ProjectInsert,
  JourneyInsert,
  ProjectUpdate,
  JourneyUpdate,
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
