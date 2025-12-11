/**
 * Pre-built prompts for common journey AI operations
 */

import { JourneyAnalysis, ImplementationPlan, JourneySummary } from './types';

export const JOURNEY_ANALYSIS_SCHEMA = `{
  title: string;
  complexity: 1 | 2 | 3 | 4 | 5;
  estimatedTasks: number;
  keyTasks: string[];
  suggestedBranchName: string;
  risks: string[];
  dependencies: string[];
}`;

export const IMPLEMENTATION_PLAN_SCHEMA = `{
  featureName: string;
  estimatedComplexity: 'low' | 'medium' | 'high';
  steps: {
    order: number;
    title: string;
    description: string;
    filesToCreate: string[];
    filesToModify: string[];
  }[];
  risks: string[];
  dependencies: string[];
}`;

export const JOURNEY_SUMMARY_SCHEMA = `{
  summary: string;
  status: 'on_track' | 'at_risk' | 'blocked';
  completedItems: string[];
  remainingItems: string[];
  blockers: string[];
  nextSteps: string[];
}`;

/**
 * Build prompt for analyzing a new journey idea
 */
export function buildJourneyAnalysisPrompt(
  journeyDescription: string,
  projectContext?: string
): string {
  let prompt = `Analyze this software development journey/feature request and provide a structured breakdown:\n\n`;
  prompt += `Journey Description:\n${journeyDescription}\n\n`;

  if (projectContext) {
    prompt += `Project Context:\n${projectContext}\n\n`;
  }

  prompt += `Consider:
- Break down into concrete, actionable tasks
- Identify potential risks and blockers
- Suggest a git branch name following conventional patterns (feature/, fix/, refactor/)
- Rate complexity from 1 (trivial) to 5 (very complex)
- List any external dependencies or prerequisites`;

  return prompt;
}

/**
 * Build prompt for creating an implementation plan
 */
export function buildImplementationPlanPrompt(
  featureDescription: string,
  techStack: string,
  existingStructure?: string
): string {
  let prompt = `Create a detailed implementation plan for this feature:\n\n`;
  prompt += `Feature: ${featureDescription}\n\n`;
  prompt += `Tech Stack: ${techStack}\n\n`;

  if (existingStructure) {
    prompt += `Existing Project Structure:\n${existingStructure}\n\n`;
  }

  prompt += `Provide:
- Step-by-step implementation order
- Files to create and modify for each step
- Identify risks and how to mitigate them
- List any dependencies that need to be installed`;

  return prompt;
}

/**
 * Build prompt for summarizing journey progress
 */
export function buildJourneySummaryPrompt(
  journeyName: string,
  gitDiff: string,
  commitHistory: string,
  originalPlan?: string
): string {
  let prompt = `Analyze the progress of this development journey:\n\n`;
  prompt += `Journey: ${journeyName}\n\n`;

  if (originalPlan) {
    prompt += `Original Plan:\n${originalPlan}\n\n`;
  }

  prompt += `Recent Commits:\n${commitHistory}\n\n`;
  prompt += `Current Changes (git diff summary):\n${gitDiff}\n\n`;

  prompt += `Provide:
- A brief summary of what's been accomplished
- Assessment of status (on_track, at_risk, or blocked)
- List completed items vs remaining items
- Any blockers identified
- Recommended next steps`;

  return prompt;
}

/**
 * Build prompt for suggesting code review feedback
 */
export function buildCodeReviewPrompt(
  diff: string,
  context?: string
): string {
  let prompt = `Review this code diff and provide constructive feedback:\n\n`;

  if (context) {
    prompt += `Context: ${context}\n\n`;
  }

  prompt += `Diff:\n\`\`\`\n${diff}\n\`\`\`\n\n`;

  prompt += `Focus on:
- Potential bugs or edge cases
- Code style and readability
- Performance considerations
- Security concerns
- Suggestions for improvement`;

  return prompt;
}

// Type exports for the response shapes
export type { JourneyAnalysis, ImplementationPlan, JourneySummary };
