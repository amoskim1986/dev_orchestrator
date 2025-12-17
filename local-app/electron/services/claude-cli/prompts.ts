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
// SPEC REFINEMENT PROMPTS
// =============================================================================

/**
 * Build prompt for refining an existing spec based on user feedback
 */
export function buildSpecRefinementPrompt(
  currentSpec: string,
  feedback: string
): string {
  return `You are refining a technical specification based on user feedback.

Current Specification:
${currentSpec}

User Feedback:
${feedback}

Apply the user's feedback to update the specification. Preserve all existing content that wasn't addressed by the feedback, and make the requested changes/additions.

Be specific about what needs to be built, modified, or removed.`;
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

/**
 * Build prompt for refining an existing plan based on user feedback
 */
export function buildPlanRefinementPrompt(
  currentPlan: string,
  feedback: string
): string {
  return `You are refining an implementation plan based on user feedback.

Current Plan:
${currentPlan}

User Feedback:
${feedback}

Apply the user's feedback to update the plan. Preserve all existing content that wasn't addressed by the feedback, and make the requested changes/additions.

Be specific about phases, tasks, dependencies, and deliverables.`;
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

// =============================================================================
// PROJECT INTAKE PROMPTS
// =============================================================================

export const PROJECT_INTAKE_SCHEMA = `{
  document: string;
}`;

export const PROJECT_INTAKE_UPDATE_SCHEMA = `{
  changes_summary: string;
  suggested_updates: string;
  updated_document: string;
}`;

export interface ProjectIntakeRefinement {
  document: string;
}

export interface ProjectIntakeUpdate {
  changes_summary: string;
  suggested_updates: string;
  updated_document: string;
}

/**
 * Build prompt for refining a raw project intake into a structured document.
 * Only includes sections where information is explicitly provided.
 */
export function buildProjectIntakeRefinementPrompt(
  rawIntake: string,
  projectName: string
): string {
  return `You are parsing a raw project intake document for a software project called "${projectName}".

Your task is to transform the raw intake into a well-structured document.

IMPORTANT RULES:
1. ONLY include sections where information is explicitly provided in the raw intake
2. Do NOT fabricate, assume, or fill in missing information
3. If a section has no relevant content in the raw intake, DO NOT include that section at all
4. Preserve the original meaning and intent - clarify, don't invent

Available sections (include only if content exists):
- Overview/Summary
- Goals & Objectives
- Key Features
- Constraints/Limitations
- Technical Requirements (include last, only if explicitly mentioned)
- Architecture Notes (include last, only if explicitly mentioned)

Raw Intake:
${rawIntake}

Format your response as a clean markdown document with appropriate headers (##) for each section you include. Return ONLY the document content, no preamble or explanation.`;
}

/**
 * Build prompt for analyzing changes between raw intake versions
 * and suggesting updates to the AI-parsed document.
 */
export function buildProjectIntakeUpdatePrompt(
  previousRaw: string,
  newRaw: string,
  existingAiDoc: string,
  projectName: string
): string {
  return `You are analyzing changes to a project intake document for "${projectName}".

Compare the previous and new versions of the raw intake, identify meaningful changes, and suggest how to update the AI-refined document.

Previous Raw Intake:
${previousRaw}

New Raw Intake:
${newRaw}

Current AI-Refined Document:
${existingAiDoc}

Provide:
1. changes_summary: A concise bullet-point summary of what changed between the raw versions (what was added, removed, or modified)
2. suggested_updates: Explanation of how these changes should affect the AI-refined document
3. updated_document: The full updated AI-refined document incorporating the changes

IMPORTANT RULES:
- Only include sections where information is explicitly provided
- Do NOT fabricate or assume missing information
- Preserve existing content that wasn't changed
- Add new content where explicitly added in the new raw intake
- Remove content that was explicitly removed from the raw intake

Return your response as valid JSON matching this schema:
{
  "changes_summary": "string with bullet points",
  "suggested_updates": "string explaining updates",
  "updated_document": "string with full markdown document"
}`;
}

// =============================================================================
// PROPOSED PROJECT JOURNEYS PROMPTS
// =============================================================================

export const PROPOSED_JOURNEYS_SCHEMA = `{
  "journeys": [
    {
      "name": "string - concise title for the journey",
      "description": "string - what this journey accomplishes",
      "early_plan": "string - brief implementation approach (2-4 sentences)"
    }
  ]
}`;

export interface GeneratedProposedJourney {
  name: string;
  description: string;
  early_plan: string;
}

export interface ProposedJourneysResult {
  journeys: GeneratedProposedJourney[];
}

export interface ExistingProposalContext {
  name: string;
  description: string;
  status: string;
}

/**
 * Build prompt for generating proposed journeys from a project's AI-parsed intake.
 * Returns a list of logical development journeys to build the project.
 *
 * @param aiParsedIntake - The AI-refined project intake document
 * @param projectName - The name of the project
 * @param existingProposals - Existing proposals with their statuses
 * @param codebasePath - Optional path to the codebase root for analysis
 */
export function buildProposedJourneysPrompt(
  aiParsedIntake: string,
  projectName: string,
  existingProposals?: ExistingProposalContext[],
  codebasePath?: string
): string {
  let contextNote = '';
  const hasExisting = existingProposals && existingProposals.length > 0;

  if (hasExisting) {
    const rejected = existingProposals.filter(p => p.status === 'rejected');
    const generated = existingProposals.filter(p => p.status === 'generated');
    const drafts = existingProposals.filter(p => p.status === 'draft');
    const alreadyCompleted = existingProposals.filter(p => p.status === 'already_completed');

    if (drafts.length > 0) {
      contextNote += `\n\nEXISTING DRAFT PROPOSALS (already suggested, do not duplicate):\n${drafts.map(p => `- ${p.name}: ${p.description}`).join('\n')}`;
    }
    if (generated.length > 0) {
      contextNote += `\n\nALREADY CREATED JOURNEYS (do not duplicate):\n${generated.map(p => `- ${p.name}: ${p.description}`).join('\n')}`;
    }
    if (alreadyCompleted.length > 0) {
      contextNote += `\n\nALREADY COMPLETED (these were marked as already done, do not suggest):\n${alreadyCompleted.map(p => `- ${p.name}: ${p.description}`).join('\n')}`;
    }
    if (rejected.length > 0) {
      contextNote += `\n\nREJECTED PROPOSALS (do NOT suggest these again):\n${rejected.map(p => `- ${p.name}`).join('\n')}`;
    }
  }

  let codebaseSection = '';
  if (codebasePath) {
    codebaseSection = `

CODEBASE LOCATION:
The project codebase is located at: ${codebasePath}

IMPORTANT - CODEBASE ANALYSIS:
Before generating journeys, you MUST analyze the existing codebase to understand:
1. What has already been built/implemented
2. The current project structure and architecture
3. Existing patterns and conventions in use
4. What functionality is missing based on the intake document

Use your tools to explore the codebase:
- List the directory structure to understand the project layout
- Read key files (package.json, README, main entry points, etc.)
- Search for existing implementations of features mentioned in the intake

DO NOT suggest journeys for functionality that already exists in the codebase. Only suggest journeys for work that still needs to be done.`;
  }

  const taskDescription = hasExisting
    ? `Based on the intake document${codebasePath ? ', your analysis of the existing codebase,' : ''} and the existing journeys listed above, identify ADDITIONAL journeys that are still needed to complete this project. Only suggest NEW journeys that aren't already covered${codebasePath ? ' or already implemented in the codebase' : ''}.`
    : `Based on this intake document${codebasePath ? ' and your analysis of the existing codebase' : ''}, identify ALL logical development journeys (features, investigations, or tasks) that would need to be completed to build this project.${codebasePath ? ' Skip any work that is already implemented in the codebase.' : ''}`;

  return `You are analyzing a project intake document for "${projectName}" to break it down into discrete development journeys.

PROJECT INTAKE:
${aiParsedIntake}${contextNote}${codebaseSection}

TASK:
${taskDescription}

GUIDELINES:
1. Each journey should be a coherent, self-contained piece of work
2. Journeys should be ordered by logical dependency (foundations first)
3. Keep journey names concise but descriptive (5-10 words max)
4. The description should clearly state what this journey accomplishes (1-2 sentences)
5. The early_plan should outline the general implementation approach (2-4 sentences)
6. Generate as many journeys as needed - don't artificially limit the count
7. Include foundational work (setup, architecture, core infrastructure) as early journeys
8. Group related functionality into single journeys when appropriate
9. Later journeys can build on earlier ones
${hasExisting ? '10. Only return NEW journeys - do not repeat existing ones' : ''}
${codebasePath ? `${hasExisting ? '11' : '10'}. Do NOT suggest journeys for features that already exist in the codebase - verify by checking the code first` : ''}

Return your response as valid JSON matching this schema:
${PROPOSED_JOURNEYS_SCHEMA}`;
}

// =============================================================================
// PROPOSED CHILD JOURNEYS PROMPTS (for feature_planning journeys)
// =============================================================================

export const PROPOSED_CHILD_JOURNEYS_SCHEMA = `{
  "journeys": [
    {
      "name": "string - concise title for the feature journey",
      "description": "string - what this feature accomplishes",
      "early_plan": "string - brief implementation approach (2-4 sentences)",
      "checklist_items": ["string - todo item 1", "string - todo item 2", ...]
    }
  ]
}`;

export interface GeneratedChildJourney {
  name: string;
  description: string;
  early_plan: string;
  checklist_items: string[];
}

export interface ProposedChildJourneysResult {
  journeys: GeneratedChildJourney[];
}

export interface ExistingChildProposalContext {
  name: string;
  description: string;
  status: string;
}

/**
 * Build prompt for generating proposed child journeys from a feature_planning journey's spec.
 * Returns a list of feature journeys that implement the planned feature.
 *
 * @param spec - The spec document from the feature_planning journey
 * @param journeyName - The name of the planning journey
 * @param existingProposals - Existing proposals with their statuses
 * @param codebasePath - Optional path to the codebase root for analysis
 */
export function buildProposedChildJourneysPrompt(
  spec: string,
  journeyName: string,
  existingProposals?: ExistingChildProposalContext[],
  codebasePath?: string
): string {
  let contextNote = '';
  const hasExisting = existingProposals && existingProposals.length > 0;

  if (hasExisting) {
    const rejected = existingProposals.filter(p => p.status === 'rejected');
    const generated = existingProposals.filter(p => p.status === 'generated');
    const drafts = existingProposals.filter(p => p.status === 'draft');

    if (drafts.length > 0) {
      contextNote += `\n\nEXISTING DRAFT PROPOSALS (already suggested, do not duplicate):\n${drafts.map(p => `- ${p.name}: ${p.description}`).join('\n')}`;
    }
    if (generated.length > 0) {
      contextNote += `\n\nALREADY CREATED JOURNEYS (do not duplicate):\n${generated.map(p => `- ${p.name}: ${p.description}`).join('\n')}`;
    }
    if (rejected.length > 0) {
      contextNote += `\n\nREJECTED PROPOSALS (do NOT suggest these again):\n${rejected.map(p => `- ${p.name}`).join('\n')}`;
    }
  }

  let codebaseSection = '';
  if (codebasePath) {
    codebaseSection = `

CODEBASE LOCATION:
The project codebase is located at: ${codebasePath}

IMPORTANT - CODEBASE ANALYSIS:
Before generating journeys, analyze the existing codebase to understand:
1. What has already been built/implemented
2. The current project structure and architecture
3. Existing patterns and conventions in use

DO NOT suggest journeys for functionality that already exists.`;
  }

  const taskDescription = hasExisting
    ? `Based on the spec${codebasePath ? ', the existing codebase,' : ''} and the existing proposals listed above, identify ADDITIONAL feature journeys still needed. Only suggest NEW journeys.`
    : `Based on this spec${codebasePath ? ' and the existing codebase' : ''}, identify the feature journeys needed to implement this planned feature.`;

  return `You are breaking down a feature planning spec for "${journeyName}" into discrete implementation journeys.

FEATURE SPEC:
${spec}${contextNote}${codebaseSection}

TASK:
${taskDescription}

GUIDELINES:
1. Each journey should be a coherent, self-contained feature that can be implemented independently
2. Journeys should be ordered by logical dependency (foundations first, then features that depend on them)
3. Keep journey names concise but descriptive (5-10 words max)
4. The description should clearly state what this journey accomplishes (1-2 sentences)
5. The early_plan should outline the implementation approach (2-4 sentences)
6. Include 3-8 checklist_items per journey - specific, actionable todos for implementation
7. Checklist items should cover: setup, core implementation, edge cases, tests, documentation
8. Generate as many journeys as needed to fully implement the spec
9. Each journey should result in a working, testable increment
${hasExisting ? '10. Only return NEW journeys - do not repeat existing ones' : ''}

Return your response as valid JSON matching this schema:
${PROPOSED_CHILD_JOURNEYS_SCHEMA}`;
}

// =============================================================================
// JOURNEY IDEA PARSING PROMPTS
// =============================================================================

export const PARSED_JOURNEY_IDEA_SCHEMA = `{
  "name": "string - concise title (5-10 words max)",
  "description": "string - detailed description of what this accomplishes",
  "early_plan": "string - brief implementation approach (2-4 sentences)",
  "type": "feature_planning | feature | bug | investigation"
}`;

export interface ParsedJourneyIdea {
  name: string;
  description: string;
  early_plan: string;
  type: 'feature_planning' | 'feature' | 'bug' | 'investigation';
}

/**
 * Build prompt for parsing a raw dictated/typed journey idea into structured fields.
 * Auto-detects the journey type based on content.
 */
export function buildParseJourneyIdeaPrompt(
  rawText: string,
  projectName: string
): string {
  return `You are parsing a raw journey idea for a software project called "${projectName}".

The user has dictated or typed a freeform description of something they want to build, fix, or investigate. Your task is to:

1. Extract a concise, descriptive title (name)
2. Write a clear description of what this journey accomplishes
3. Suggest a brief early implementation plan
4. Detect the appropriate journey type

RAW INPUT:
${rawText}

JOURNEY TYPES:
- "feature_planning": Planning a new feature (needs specs, designs, plans before implementation)
- "feature": Implementing an already-planned feature (ready to code)
- "bug": Fixing a reported bug or issue
- "investigation": Research, exploration, or learning without specific implementation

DETECTION GUIDELINES:
- If the input mentions "bug", "fix", "broken", "error", "issue", "not working" → type is "bug"
- If the input mentions "research", "investigate", "explore", "learn", "understand", "POC", "spike" → type is "investigation"
- If the input describes something that needs planning/design first → type is "feature_planning"
- If the input describes something ready to implement with clear requirements → type is "feature"
- When in doubt, default to "feature_planning"

Return your response as valid JSON matching this schema:
${PARSED_JOURNEY_IDEA_SCHEMA}`;
}

// Type exports for the response shapes
export type { JourneyAnalysis, ImplementationPlan, JourneySummary };
