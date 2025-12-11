import { ipcMain } from 'electron';
import { getClaudeCliService } from '../services/claude-cli/claude-cli.service';
import {
  ClaudeCliRequest,
  JourneyAnalysis,
  ImplementationPlan,
  JourneySummary,
} from '../services/claude-cli/types';
import {
  buildJourneyAnalysisPrompt,
  buildImplementationPlanPrompt,
  buildJourneySummaryPrompt,
  JOURNEY_ANALYSIS_SCHEMA,
  IMPLEMENTATION_PLAN_SCHEMA,
  JOURNEY_SUMMARY_SCHEMA,
} from '../services/claude-cli/prompts';

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

  // Pre-built: Analyze a journey idea
  ipcMain.handle(
    'claude:analyzeJourney',
    async (_event, { description, projectContext }: { description: string; projectContext?: string }) => {
      const prompt = buildJourneyAnalysisPrompt(description, projectContext);
      return service.queryJson<JourneyAnalysis>(prompt, JOURNEY_ANALYSIS_SCHEMA);
    }
  );

  // Pre-built: Create implementation plan
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

  // Get service status
  ipcMain.handle('claude:getStatus', async () => {
    return service.getStatus();
  });

  // Clear queue
  ipcMain.handle('claude:clearQueue', async () => {
    return service.clearQueue();
  });
}
