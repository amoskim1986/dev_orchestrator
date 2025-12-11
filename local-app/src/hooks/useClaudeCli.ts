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

    // Actions
    analyzeJourney: store.analyzeJourney,
    createPlan: store.createPlan,
    summarizeJourney: store.summarizeJourney,
    queryRaw: store.queryRaw,
    queryJson: store.queryJson,
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
