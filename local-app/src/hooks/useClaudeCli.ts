import { useCallback, useEffect } from 'react'
import { useClaudeCliStore } from '../stores/claudeCliStore'

/**
 * Hook for using Claude CLI AI features in components
 *
 * @example
 * ```tsx
 * function JourneyForm() {
 *   const { analyzeJourney, isProcessing, lastAnalysis, lastError } = useClaudeCli()
 *
 *   const handleAnalyze = async () => {
 *     const result = await analyzeJourney('Add dark mode toggle')
 *     if (result) {
 *       console.log('Tasks:', result.keyTasks)
 *     }
 *   }
 *
 *   return (
 *     <div>
 *       <button onClick={handleAnalyze} disabled={isProcessing}>
 *         {isProcessing ? 'Analyzing...' : 'Analyze with AI'}
 *       </button>
 *       {lastError && <div className="error">{lastError}</div>}
 *     </div>
 *   )
 * }
 * ```
 */
export function useClaudeCli() {
  const store = useClaudeCliStore()

  // Refresh status on mount
  useEffect(() => {
    store.refreshStatus()
  }, [])

  return {
    // State
    isProcessing: store.isProcessing,
    queueLength: store.queueLength,
    activeRequests: store.activeRequests,
    lastError: store.lastError,
    lastDurationMs: store.lastDurationMs,

    // Cached results
    lastAnalysis: store.lastAnalysis,
    lastPlan: store.lastPlan,
    lastSummary: store.lastSummary,
    lastProjectIntakeRefinement: store.lastProjectIntakeRefinement,
    lastProjectIntakeUpdate: store.lastProjectIntakeUpdate,

    // Actions
    analyzeJourney: store.analyzeJourney,
    createPlan: store.createPlan,
    summarizeJourney: store.summarizeJourney,
    queryRaw: store.queryRaw,
    queryJson: store.queryJson,
    // Project intake actions
    refineProjectIntake: store.refineProjectIntake,
    analyzeProjectIntakeChanges: store.analyzeProjectIntakeChanges,
    // Proposed journeys actions
    generateProposedJourneys: store.generateProposedJourneys,
    lastProposedJourneys: store.lastProposedJourneys,
    // Journey idea parsing actions
    parseJourneyIdea: store.parseJourneyIdea,
    lastParsedJourneyIdea: store.lastParsedJourneyIdea,
    clearQueue: store.clearQueue,
    clearError: store.clearError,
    refreshStatus: store.refreshStatus,
  }
}

/**
 * Hook for analyzing a journey with automatic state management
 */
export function useJourneyAnalysis() {
  const { analyzeJourney, isProcessing, lastAnalysis, lastError, lastDurationMs, clearError } = useClaudeCli()

  const analyze = useCallback(
    async (description: string, projectContext?: string) => {
      return analyzeJourney(description, projectContext)
    },
    [analyzeJourney]
  )

  return {
    analyze,
    isAnalyzing: isProcessing,
    analysis: lastAnalysis,
    error: lastError,
    durationMs: lastDurationMs,
    clearError,
  }
}

/**
 * Hook for creating implementation plans
 */
export function useImplementationPlan() {
  const { createPlan, isProcessing, lastPlan, lastError, lastDurationMs, clearError } = useClaudeCli()

  const create = useCallback(
    async (featureDescription: string, techStack: string, existingStructure?: string) => {
      return createPlan(featureDescription, techStack, existingStructure)
    },
    [createPlan]
  )

  return {
    create,
    isCreating: isProcessing,
    plan: lastPlan,
    error: lastError,
    durationMs: lastDurationMs,
    clearError,
  }
}

/**
 * Hook for summarizing journey progress
 */
export function useJourneySummary() {
  const { summarizeJourney, isProcessing, lastSummary, lastError, lastDurationMs, clearError } = useClaudeCli()

  const summarize = useCallback(
    async (journeyName: string, gitDiff: string, commitHistory: string, originalPlan?: string) => {
      return summarizeJourney(journeyName, gitDiff, commitHistory, originalPlan)
    },
    [summarizeJourney]
  )

  return {
    summarize,
    isSummarizing: isProcessing,
    summary: lastSummary,
    error: lastError,
    durationMs: lastDurationMs,
    clearError,
  }
}

/**
 * Hook for project intake AI refinement
 */
export function useProjectIntakeAI() {
  const {
    refineProjectIntake,
    analyzeProjectIntakeChanges,
    isProcessing,
    lastProjectIntakeRefinement,
    lastProjectIntakeUpdate,
    lastError,
    lastDurationMs,
    clearError,
  } = useClaudeCli()

  const refine = useCallback(
    async (rawIntake: string, projectName: string) => {
      return refineProjectIntake(rawIntake, projectName)
    },
    [refineProjectIntake]
  )

  const analyzeChanges = useCallback(
    async (previousRaw: string, newRaw: string, existingAiDoc: string, projectName: string) => {
      return analyzeProjectIntakeChanges(previousRaw, newRaw, existingAiDoc, projectName)
    },
    [analyzeProjectIntakeChanges]
  )

  return {
    refine,
    analyzeChanges,
    isProcessing,
    refinement: lastProjectIntakeRefinement,
    update: lastProjectIntakeUpdate,
    error: lastError,
    durationMs: lastDurationMs,
    clearError,
  }
}

/**
 * Hook for generating proposed journeys from project intake
 */
export function useProposedJourneysAI() {
  const {
    generateProposedJourneys,
    isProcessing,
    lastProposedJourneys,
    lastError,
    lastDurationMs,
    clearError,
  } = useClaudeCli()

  const generate = useCallback(
    async (aiParsedIntake: string, projectName: string, existingProposals?: { name: string; description: string; status: string }[], codebasePath?: string) => {
      return generateProposedJourneys(aiParsedIntake, projectName, existingProposals, codebasePath)
    },
    [generateProposedJourneys]
  )

  return {
    generate,
    isGenerating: isProcessing,
    result: lastProposedJourneys,
    error: lastError,
    durationMs: lastDurationMs,
    clearError,
  }
}

/**
 * Hook for parsing raw journey ideas into structured format with AI
 */
export function useJourneyIdeaParser() {
  const {
    parseJourneyIdea,
    isProcessing,
    lastParsedJourneyIdea,
    lastError,
    lastDurationMs,
    clearError,
  } = useClaudeCli()

  const parse = useCallback(
    async (rawText: string, projectName: string) => {
      return parseJourneyIdea(rawText, projectName)
    },
    [parseJourneyIdea]
  )

  return {
    parse,
    isParsing: isProcessing,
    result: lastParsedJourneyIdea,
    error: lastError,
    durationMs: lastDurationMs,
    clearError,
  }
}
