import { create } from 'zustand'

// Re-define types for renderer (can't import from electron)
interface ClaudeCliResponse<T = unknown> {
  success: boolean
  data?: T
  rawOutput?: string
  error?: string
  durationMs: number
}

interface JourneyAnalysis {
  title: string
  complexity: 1 | 2 | 3 | 4 | 5
  estimatedTasks: number
  keyTasks: string[]
  suggestedBranchName: string
  risks: string[]
  dependencies: string[]
}

interface ImplementationPlan {
  featureName: string
  estimatedComplexity: 'low' | 'medium' | 'high'
  steps: {
    order: number
    title: string
    description: string
    filesToCreate: string[]
    filesToModify: string[]
  }[]
  risks: string[]
  dependencies: string[]
}

interface JourneySummary {
  summary: string
  status: 'on_track' | 'at_risk' | 'blocked'
  completedItems: string[]
  remainingItems: string[]
  blockers: string[]
  nextSteps: string[]
}

interface ClaudeCliState {
  // Status
  isProcessing: boolean
  queueLength: number
  activeRequests: number
  lastError: string | null
  lastDurationMs: number | null

  // Cached results
  lastAnalysis: JourneyAnalysis | null
  lastPlan: ImplementationPlan | null
  lastSummary: JourneySummary | null

  // Actions
  analyzeJourney: (description: string, projectContext?: string) => Promise<JourneyAnalysis | null>
  createPlan: (featureDescription: string, techStack: string, existingStructure?: string) => Promise<ImplementationPlan | null>
  summarizeJourney: (journeyName: string, gitDiff: string, commitHistory: string, originalPlan?: string) => Promise<JourneySummary | null>
  queryRaw: (prompt: string) => Promise<string | null>
  queryJson: <T>(prompt: string, jsonSchema: string) => Promise<T | null>
  refreshStatus: () => Promise<void>
  clearQueue: () => Promise<number>
  clearError: () => void
}

export const useClaudeCliStore = create<ClaudeCliState>((set, get) => ({
  // Initial state
  isProcessing: false,
  queueLength: 0,
  activeRequests: 0,
  lastError: null,
  lastDurationMs: null,
  lastAnalysis: null,
  lastPlan: null,
  lastSummary: null,

  // Analyze a journey idea
  analyzeJourney: async (description: string, projectContext?: string) => {
    set({ isProcessing: true, lastError: null })
    try {
      const response = await window.electronAPI.claude.analyzeJourney(description, projectContext)
      set({
        isProcessing: false,
        lastDurationMs: response.durationMs,
        lastAnalysis: response.success ? response.data ?? null : null,
        lastError: response.success ? null : response.error ?? 'Unknown error',
      })
      return response.success ? response.data ?? null : null
    } catch (err) {
      const error = (err as Error).message
      set({ isProcessing: false, lastError: error })
      return null
    }
  },

  // Create implementation plan
  createPlan: async (featureDescription: string, techStack: string, existingStructure?: string) => {
    set({ isProcessing: true, lastError: null })
    try {
      const response = await window.electronAPI.claude.createPlan(featureDescription, techStack, existingStructure)
      set({
        isProcessing: false,
        lastDurationMs: response.durationMs,
        lastPlan: response.success ? response.data ?? null : null,
        lastError: response.success ? null : response.error ?? 'Unknown error',
      })
      return response.success ? response.data ?? null : null
    } catch (err) {
      const error = (err as Error).message
      set({ isProcessing: false, lastError: error })
      return null
    }
  },

  // Summarize journey progress
  summarizeJourney: async (journeyName: string, gitDiff: string, commitHistory: string, originalPlan?: string) => {
    set({ isProcessing: true, lastError: null })
    try {
      const response = await window.electronAPI.claude.summarizeJourney(journeyName, gitDiff, commitHistory, originalPlan)
      set({
        isProcessing: false,
        lastDurationMs: response.durationMs,
        lastSummary: response.success ? response.data ?? null : null,
        lastError: response.success ? null : response.error ?? 'Unknown error',
      })
      return response.success ? response.data ?? null : null
    } catch (err) {
      const error = (err as Error).message
      set({ isProcessing: false, lastError: error })
      return null
    }
  },

  // Raw query (returns text)
  queryRaw: async (prompt: string) => {
    set({ isProcessing: true, lastError: null })
    try {
      const response = await window.electronAPI.claude.query({ prompt })
      set({
        isProcessing: false,
        lastDurationMs: response.durationMs,
        lastError: response.success ? null : response.error ?? 'Unknown error',
      })
      return response.success ? (response.rawOutput ?? null) : null
    } catch (err) {
      const error = (err as Error).message
      set({ isProcessing: false, lastError: error })
      return null
    }
  },

  // JSON query (returns typed data)
  queryJson: async <T>(prompt: string, jsonSchema: string) => {
    set({ isProcessing: true, lastError: null })
    try {
      const response = await window.electronAPI.claude.queryJson<T>(prompt, jsonSchema)
      set({
        isProcessing: false,
        lastDurationMs: response.durationMs,
        lastError: response.success ? null : response.error ?? 'Unknown error',
      })
      return response.success ? (response.data ?? null) : null
    } catch (err) {
      const error = (err as Error).message
      set({ isProcessing: false, lastError: error })
      return null
    }
  },

  // Refresh service status
  refreshStatus: async () => {
    try {
      const status = await window.electronAPI.claude.getStatus()
      set({
        queueLength: status.queueLength,
        activeRequests: status.activeRequests,
      })
    } catch {
      // Ignore status fetch errors
    }
  },

  // Clear pending queue
  clearQueue: async () => {
    try {
      const cleared = await window.electronAPI.claude.clearQueue()
      await get().refreshStatus()
      return cleared
    } catch {
      return 0
    }
  },

  // Clear error
  clearError: () => {
    set({ lastError: null })
  },
}))

// Export types for consumers
export type { JourneyAnalysis, ImplementationPlan, JourneySummary, ClaudeCliResponse }
