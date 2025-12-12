import { ipcMain } from 'electron';
import { getClaudeCliService } from '../services/claude-cli/claude-cli.service';
import {
  ClaudeCliRequest,
  JourneyAnalysis,
  ImplementationPlan,
  JourneySummary,
} from '../services/claude-cli/types';
import {
  // New intake/spec/plan prompts
  buildIntakeRefinementPrompt,
  buildSpecGenerationPrompt,
  buildPlanGenerationPrompt,
  REFINED_INTAKE_SCHEMA,
  SPEC_SCHEMA,
  PLAN_SCHEMA,
  // Legacy prompts
  buildJourneyAnalysisPrompt,
  buildImplementationPlanPrompt,
  buildJourneySummaryPrompt,
  JOURNEY_ANALYSIS_SCHEMA,
  IMPLEMENTATION_PLAN_SCHEMA,
  JOURNEY_SUMMARY_SCHEMA,
  // Project intake prompts
  buildProjectIntakeRefinementPrompt,
  buildProjectIntakeUpdatePrompt,
  PROJECT_INTAKE_UPDATE_SCHEMA,
  ProjectIntakeRefinement,
  ProjectIntakeUpdate,
} from '../services/claude-cli/prompts';

// Response types for new prompts
export interface RefinedIntake {
  title: string;
  problem: string;
  proposedSolution: string;
  userStories: string[];
  acceptanceCriteria: string[];
  outOfScope: string[];
  openQuestions: string[];
}

export interface Spec {
  overview: string;
  goals: string[];
  nonGoals: string[];
  technicalApproach: {
    summary: string;
    components: { name: string; purpose: string; changes: string }[];
  };
  dataModel: {
    newEntities: { name: string; fields: string[] }[];
    modifiedEntities: { name: string; changes: string }[];
  };
  apiChanges: {
    newEndpoints: { method: string; path: string; purpose: string }[];
    modifiedEndpoints: { method: string; path: string; changes: string }[];
  };
  uiChanges: {
    newScreens: { name: string; purpose: string }[];
    modifiedScreens: { name: string; changes: string }[];
  };
  testing: {
    unitTests: string[];
    integrationTests: string[];
    e2eTests: string[];
  };
  rollout: {
    featureFlags: string[];
    migrationSteps: string[];
    rollbackPlan: string;
  };
  openQuestions: string[];
}

export interface Plan {
  summary: string;
  estimatedEffort: 'small' | 'medium' | 'large' | 'x-large';
  phases: {
    name: string;
    description: string;
    tasks: {
      title: string;
      description: string;
      estimatedHours: number;
      dependencies: string[];
      deliverables: string[];
    }[];
  }[];
  risks: { risk: string; mitigation: string; severity: 'low' | 'medium' | 'high' }[];
  milestones: { name: string; criteria: string }[];
}

export function registerClaudeCliIpc() {
  const service = getClaudeCliService();

  // Generic query - raw prompt, raw response
  ipcMain.handle(
    'claude:query',
    async (_event, request: ClaudeCliRequest) => {
      return service.query(request);
    }
  );

  // JSON query - expects structured response
  ipcMain.handle(
    'claude:queryJson',
    async (
      _event,
      { prompt, jsonSchema, options }: { prompt: string; jsonSchema: string; options?: Partial<ClaudeCliRequest> }
    ) => {
      return service.queryJson(prompt, jsonSchema, options);
    }
  );

  // =============================================================================
  // NEW: Intake/Spec/Plan workflow
  // =============================================================================

  // Refine raw intake into structured format
  ipcMain.handle(
    'claude:refineIntake',
    async (
      _event,
      {
        rawIntake,
        journeyType,
        projectContext,
      }: {
        rawIntake: string;
        journeyType: 'feature_planning' | 'feature' | 'bug' | 'investigation';
        projectContext?: string;
      }
    ) => {
      const prompt = buildIntakeRefinementPrompt(rawIntake, journeyType, projectContext);
      return service.queryJson<RefinedIntake>(prompt, REFINED_INTAKE_SCHEMA);
    }
  );

  // Generate spec from refined intake
  ipcMain.handle(
    'claude:generateSpec',
    async (
      _event,
      {
        refinedIntake,
        projectContext,
        techStack,
      }: {
        refinedIntake: string;
        projectContext?: string;
        techStack?: string;
      }
    ) => {
      const prompt = buildSpecGenerationPrompt(refinedIntake, projectContext, techStack);
      return service.queryJson<Spec>(prompt, SPEC_SCHEMA);
    }
  );

  // Generate implementation plan from spec
  ipcMain.handle(
    'claude:generatePlan',
    async (
      _event,
      {
        spec,
        projectContext,
      }: {
        spec: string;
        projectContext?: string;
      }
    ) => {
      const prompt = buildPlanGenerationPrompt(spec, projectContext);
      return service.queryJson<Plan>(prompt, PLAN_SCHEMA);
    }
  );

  // =============================================================================
  // LEGACY: Pre-built journey operations
  // =============================================================================

  // Pre-built: Analyze a journey idea
  ipcMain.handle(
    'claude:analyzeJourney',
    async (_event, { description, projectContext }: { description: string; projectContext?: string }) => {
      const prompt = buildJourneyAnalysisPrompt(description, projectContext);
      return service.queryJson<JourneyAnalysis>(prompt, JOURNEY_ANALYSIS_SCHEMA);
    }
  );

  // Pre-built: Create implementation plan (legacy)
  ipcMain.handle(
    'claude:createPlan',
    async (
      _event,
      {
        featureDescription,
        techStack,
        existingStructure,
      }: { featureDescription: string; techStack: string; existingStructure?: string }
    ) => {
      const prompt = buildImplementationPlanPrompt(featureDescription, techStack, existingStructure);
      return service.queryJson<ImplementationPlan>(prompt, IMPLEMENTATION_PLAN_SCHEMA);
    }
  );

  // Pre-built: Summarize journey progress
  ipcMain.handle(
    'claude:summarizeJourney',
    async (
      _event,
      {
        journeyName,
        gitDiff,
        commitHistory,
        originalPlan,
      }: { journeyName: string; gitDiff: string; commitHistory: string; originalPlan?: string }
    ) => {
      const prompt = buildJourneySummaryPrompt(journeyName, gitDiff, commitHistory, originalPlan);
      return service.queryJson<JourneySummary>(prompt, JOURNEY_SUMMARY_SCHEMA);
    }
  );

  // =============================================================================
  // PROJECT INTAKE: AI refinement for project-level intake documents
  // =============================================================================

  // Refine raw project intake into structured document
  ipcMain.handle(
    'claude:refineProjectIntake',
    async (
      _event,
      {
        rawIntake,
        projectName,
      }: {
        rawIntake: string;
        projectName: string;
      }
    ) => {
      const prompt = buildProjectIntakeRefinementPrompt(rawIntake, projectName);
      // For the initial refinement, we get back markdown directly (not JSON)
      const result = await service.query({ prompt });
      if (result.success && result.data) {
        return {
          success: true,
          data: { document: result.data } as ProjectIntakeRefinement,
          durationMs: result.durationMs,
        };
      }
      return result;
    }
  );

  // Analyze changes between raw intake versions and suggest AI doc updates
  ipcMain.handle(
    'claude:analyzeProjectIntakeChanges',
    async (
      _event,
      {
        previousRaw,
        newRaw,
        existingAiDoc,
        projectName,
      }: {
        previousRaw: string;
        newRaw: string;
        existingAiDoc: string;
        projectName: string;
      }
    ) => {
      const prompt = buildProjectIntakeUpdatePrompt(previousRaw, newRaw, existingAiDoc, projectName);
      return service.queryJson<ProjectIntakeUpdate>(prompt, PROJECT_INTAKE_UPDATE_SCHEMA);
    }
  );

  // Get service status
  ipcMain.handle('claude:getStatus', async () => {
    return service.getStatus();
  });

  // Clear queue
  ipcMain.handle('claude:clearQueue', async () => {
    return service.clearQueue();
  });
}
