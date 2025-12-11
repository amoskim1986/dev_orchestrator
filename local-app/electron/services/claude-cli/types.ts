/**
 * Types for Claude CLI wrapper service
 * Turns Claude Code CLI into a local API for the dev_orchestrator app
 */

export interface ClaudeCliRequest {
  /** The prompt to send to Claude */
  prompt: string;

  /** Optional JSON schema hint to encourage structured output */
  jsonSchema?: string;

  /** Working directory for Claude to use (affects CLAUDE.md context) */
  workingDirectory?: string;

  /** Timeout in milliseconds (default: 120000 = 2 min) */
  timeout?: number;

  /** Priority for queue ordering (higher = sooner) */
  priority?: number;
}

export interface ClaudeCliResponse<T = unknown> {
  success: boolean;
  data?: T;
  rawOutput?: string;
  error?: string;
  durationMs: number;
}

export interface ClaudeCliServiceConfig {
  /** Max concurrent requests (default: 1 to avoid rate limits) */
  maxConcurrent: number;

  /** Default timeout in ms */
  defaultTimeout: number;

  /** Retry failed requests */
  retryOnError: boolean;

  /** Max retry attempts */
  maxRetries: number;

  /** Base delay between retries in ms (doubles each retry) */
  retryDelayMs: number;
}

export const DEFAULT_CONFIG: ClaudeCliServiceConfig = {
  maxConcurrent: 1,
  defaultTimeout: 120000,
  retryOnError: true,
  maxRetries: 2,
  retryDelayMs: 1000,
};

// Pre-defined prompts for common journey operations
export interface JourneyAnalysis {
  title: string;
  complexity: 1 | 2 | 3 | 4 | 5;
  estimatedTasks: number;
  keyTasks: string[];
  suggestedBranchName: string;
  risks: string[];
  dependencies: string[];
}

export interface ImplementationPlan {
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
}

export interface JourneySummary {
  summary: string;
  status: 'on_track' | 'at_risk' | 'blocked';
  completedItems: string[];
  remainingItems: string[];
  blockers: string[];
  nextSteps: string[];
}

// Queue item for internal tracking
export interface QueueItem {
  id: string;
  request: ClaudeCliRequest;
  resolve: (response: ClaudeCliResponse) => void;
  reject: (error: Error) => void;
  addedAt: number;
}
