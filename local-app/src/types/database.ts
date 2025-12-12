import type {
  Project,
  ProjectInsert,
  ProjectUpdate,
  ProjectTarget,
  ProjectTargetInsert,
  ProjectTargetUpdate,
  Journey,
  JourneyInsert,
  JourneyUpdate,
  JourneyIntake,
  JourneyIntakeInsert,
  JourneyIntakeUpdate,
  JourneySpec,
  JourneySpecInsert,
  JourneySpecUpdate,
  JourneyPlan,
  JourneyPlanInsert,
  JourneyPlanUpdate,
  JourneyChecklist,
  JourneyChecklistInsert,
  JourneyChecklistUpdate,
  JourneyLink,
  JourneyLinkInsert,
  JourneyTarget,
  JourneyTargetInsert,
  JourneySession,
  JourneySessionInsert,
  JourneySessionUpdate,
  SessionProcess,
  SessionProcessInsert,
  SessionProcessUpdate,
  SessionAiTool,
  SessionAiToolInsert,
  SessionAiToolUpdate,
} from './index';

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: Project;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
      };
      project_targets: {
        Row: ProjectTarget;
        Insert: ProjectTargetInsert;
        Update: ProjectTargetUpdate;
      };
      journeys: {
        Row: Journey;
        Insert: JourneyInsert;
        Update: JourneyUpdate;
      };
      journey_intakes: {
        Row: JourneyIntake;
        Insert: JourneyIntakeInsert;
        Update: JourneyIntakeUpdate;
      };
      journey_specs: {
        Row: JourneySpec;
        Insert: JourneySpecInsert;
        Update: JourneySpecUpdate;
      };
      journey_plans: {
        Row: JourneyPlan;
        Insert: JourneyPlanInsert;
        Update: JourneyPlanUpdate;
      };
      journey_checklists: {
        Row: JourneyChecklist;
        Insert: JourneyChecklistInsert;
        Update: JourneyChecklistUpdate;
      };
      journey_links: {
        Row: JourneyLink;
        Insert: JourneyLinkInsert;
        Update: never; // Links are immutable, delete and recreate
      };
      journey_targets: {
        Row: JourneyTarget;
        Insert: JourneyTargetInsert;
        Update: never; // Junction table, delete and recreate
      };
      journey_sessions: {
        Row: JourneySession;
        Insert: JourneySessionInsert;
        Update: JourneySessionUpdate;
      };
      session_processes: {
        Row: SessionProcess;
        Insert: SessionProcessInsert;
        Update: SessionProcessUpdate;
      };
      session_ai_tools: {
        Row: SessionAiTool;
        Insert: SessionAiToolInsert;
        Update: SessionAiToolUpdate;
      };
    };
  };
}
