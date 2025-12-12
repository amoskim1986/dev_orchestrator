/**
 * Pre-built prompts for common journey AI operations
 */

import { JourneyAnalysis, ImplementationPlan, JourneySummary } from './types';

// =============================================================================
// INTAKE REFINEMENT PROMPTS
// =============================================================================

export const REFINED_INTAKE_SCHEMA = `{
  title: string;
  problem: string;
  proposedSolution: string;
  userStories: string[];
  acceptanceCriteria: string[];
  outOfScope: string[];
  openQuestions: string[];
}`;

/**
 * Build prompt for refining a raw intake into a structured format
 */
export function buildIntakeRefinementPrompt(
  rawIntake: string,
  journeyType: 'feature_planning' | 'feature' | 'bug' | 'investigation',
  projectContext?: string
): string {
  const typeSpecificGuidance = {
    feature_planning: `This is a feature planning journey. Focus on:
- Clarifying the problem being solved
- Breaking down into user stories
- Defining clear acceptance criteria
- Identifying what's explicitly out of scope`,
    feature: `This is a feature implementation journey. Focus on:
- Technical requirements
- Implementation constraints
- Integration points
- Testing requirements`,
    bug: `This is a bug fix journey. Focus on:
- Reproducing the issue
- Impact and severity
- Expected vs actual behavior
- Steps to reproduce`,
    investigation: `This is an investigation journey. Focus on:
- What needs to be learned/discovered
- Success criteria for the investigation
- Deliverables (documentation, POC, recommendation)
- Time constraints`,
  };

  let prompt = `Refine this raw feature intake into a well-structured format.

Raw Intake:
${rawIntake}

${typeSpecificGuidance[journeyType]}`;

  if (projectContext) {
    prompt += `\n\nProject Context:\n${projectContext}`;
  }

  prompt += `

Transform this into a clear, actionable intake document. Preserve the original intent but add structure, clarity, and completeness. If information is missing, note it in openQuestions.`;

  return prompt;
}

// =============================================================================
// SPEC GENERATION PROMPTS
// =============================================================================

export const SPEC_SCHEMA = `{
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
}`;

/**
 * Build prompt for generating a spec from a refined intake
 */
export function buildSpecGenerationPrompt(
  refinedIntake: string,
  projectContext?: string,
  techStack?: string
): string {
  let prompt = `Create a detailed technical specification from this refined intake.

Refined Intake:
${refinedIntake}`;

  if (techStack) {
    prompt += `\n\nTech Stack: ${techStack}`;
  }

  if (projectContext) {
    prompt += `\n\nProject Context:\n${projectContext}`;
  }

  prompt += `

Generate a comprehensive spec that covers:
1. Technical approach and architecture
2. Data model changes
3. API changes
4. UI/UX changes
5. Testing strategy
6. Rollout and migration plan

Be specific about what needs to be built, modified, or removed.`;

  return prompt;
}

// =============================================================================
// PLAN GENERATION PROMPTS
// =============================================================================

export const PLAN_SCHEMA = `{
  summary: string;
  estimatedEffort: "small" | "medium" | "large" | "x-large";
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
  risks: { risk: string; mitigation: string; severity: "low" | "medium" | "high" }[];
  milestones: { name: string; criteria: string }[];
}`;

/**
 * Build prompt for generating an implementation plan from a spec
 */
export function buildPlanGenerationPrompt(
  spec: string,
  projectContext?: string
): string {
  let prompt = `Create a detailed implementation plan from this technical specification.

Specification:
${spec}`;

  if (projectContext) {
    prompt += `\n\nProject Context:\n${projectContext}`;
  }

  prompt += `

Generate an actionable implementation plan that:
1. Breaks work into logical phases
2. Identifies task dependencies
3. Estimates effort for each task
4. Highlights risks and mitigations
5. Defines clear milestones

Each task should be independently completable and testable.`;

  return prompt;
}

// =============================================================================
// LEGACY PROMPTS (kept for backwards compatibility)
// =============================================================================

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
