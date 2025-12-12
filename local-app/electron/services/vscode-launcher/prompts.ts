/**
 * VS Code Launcher - Prompt Templates
 * Generates contextual prompts based on journey type and stage
 */

import type { JourneyType, JourneyStage } from '@dev-orchestrator/shared'

interface PromptContext {
  journeyId: string
  journeyName: string
  journeyType: JourneyType
  journeyStage: JourneyStage
  worktreePath: string
  projectRootPath: string
}

// Stage-specific prompt fragments
const STAGE_PROMPTS: Record<string, string> = {
  // Feature planning stages
  intake:
    'Review the feature requirements and help me understand the scope. What clarifying questions should we address?',
  speccing:
    'Help me write a detailed specification for this feature. Include user stories, acceptance criteria, and edge cases.',
  ui_planning:
    'Help me plan the UI/UX for this feature. What components do we need? What are the user flows?',
  planning:
    'Create a detailed implementation plan. Break this down into steps, identify files to create/modify, and flag potential risks.',
  review: 'Review the plan for completeness. Are there any gaps, risks, or dependencies we missed?',
  approved: 'The plan is approved. Help me prepare to start implementation.',

  // Feature implementation stages
  review_and_edit_plan: "Let's review and refine the implementation plan before we start coding.",
  implementing: "Let's continue implementing this feature. What's the next step?",
  testing: 'Help me write tests for the implemented feature. What edge cases should we cover?',
  pre_prod_review: "Let's do a pre-production review. Check for any issues before merging.",
  merge_approved: 'The code is approved for merge. Help me prepare the final commit and PR description.',
  staging_qa: 'The feature is in staging. Help me verify it works correctly.',
  deployed: "The feature is deployed. Let's document any follow-up items.",

  // Bug stages
  reported: 'A bug has been reported. Help me understand the issue and reproduce it.',
  investigating: 'Help me investigate this bug. What are the potential causes?',
  fixing: "Let's fix this bug. What's the safest approach?",

  // Investigation stages
  in_progress: 'Continue the investigation. What should we look at next?',
  complete: 'The investigation is complete. Help me summarize findings.',
}

// Type-specific prompt prefixes
const TYPE_PREFIXES: Record<JourneyType, string> = {
  feature: "I'm working on a new feature:",
  feature_planning: "I'm planning a new feature:",
  bug: "I'm working on a bug fix:",
  investigation: "I'm conducting a technical investigation:",
}

/**
 * Build a contextual prompt for a journey based on its type and stage
 */
export function buildPromptForJourney(context: PromptContext): string {
  const typePrefix = TYPE_PREFIXES[context.journeyType]
  const stagePrompt = STAGE_PROMPTS[context.journeyStage] || 'Help me with the next step.'

  return `${typePrefix} "${context.journeyName}"

Current stage: ${context.journeyStage}

${stagePrompt}

Please start by exploring the codebase in this worktree to understand the context.`
}

/**
 * Build a prompt for resuming work on a journey
 */
export function buildResumePrompt(context: PromptContext, lastActivity?: string): string {
  const base = buildPromptForJourney(context)

  if (lastActivity) {
    return `${base}

Last time we were working on: ${lastActivity}

Let's pick up where we left off.`
  }

  return base
}

/**
 * Build a prompt for code review
 */
export function buildCodeReviewPrompt(context: PromptContext): string {
  return `${TYPE_PREFIXES[context.journeyType]} "${context.journeyName}"

Please review the changes in this worktree:
1. Run \`git diff\` to see the current changes
2. Check for any issues, bugs, or improvements
3. Verify the code follows project conventions
4. Suggest any refactoring if needed`
}

/**
 * Build a prompt for testing
 */
export function buildTestingPrompt(context: PromptContext): string {
  return `${TYPE_PREFIXES[context.journeyType]} "${context.journeyName}"

Help me test this implementation:
1. Review the changes to understand what needs testing
2. Identify test cases (happy path, edge cases, error cases)
3. Write or update tests as needed
4. Verify existing tests still pass`
}
