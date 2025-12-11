/**
 * Claude CLI Service - Public API
 * Turns Claude Code CLI into a local API for the dev_orchestrator app
 */

export {
  ClaudeCliService,
  getClaudeCliService,
  resetClaudeCliService,
} from './claude-cli.service';

export type {
  ClaudeCliRequest,
  ClaudeCliResponse,
  ClaudeCliServiceConfig,
  JourneyAnalysis,
  ImplementationPlan,
  JourneySummary,
} from './types';

export { DEFAULT_CONFIG } from './types';

export {
  buildJourneyAnalysisPrompt,
  buildImplementationPlanPrompt,
  buildJourneySummaryPrompt,
  buildCodeReviewPrompt,
  JOURNEY_ANALYSIS_SCHEMA,
  IMPLEMENTATION_PLAN_SCHEMA,
  JOURNEY_SUMMARY_SCHEMA,
} from './prompts';

export { parseClaudeResponse, validateShape } from './parser';
