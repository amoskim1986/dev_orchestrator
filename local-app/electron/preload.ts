import { contextBridge, ipcRenderer } from 'electron'

// Type definitions inline (can't import from renderer in preload)
interface ClaudeProject {
  id: string
  path: string
  name: string
  sessionCount: number
  lastActive: Date
}

interface ClaudeSession {
  id: string
  projectId: string
  filePath: string
  messageCount: number
  timestamp: Date
  gitBranch: string
  firstMessage: string
}

interface ClaudeMessage {
  uuid?: string
  type: 'user' | 'assistant'
  timestamp: Date
  content: Array<{ type: string; text?: string; name?: string; id?: string; input?: unknown }>
  model?: string
}

// Claude CLI service types
interface ClaudeCliRequest {
  prompt: string
  jsonSchema?: string
  workingDirectory?: string
  timeout?: number
  priority?: number
}

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

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,

  // History API
  history: {
    getProjects: () => ipcRenderer.invoke('history:getProjects'),
    getSessions: (projectId: string) => ipcRenderer.invoke('history:getSessions', projectId),
    getMessages: (filePath: string) => ipcRenderer.invoke('history:getMessages', filePath),
    openInFinder: (filePath: string) => ipcRenderer.invoke('history:openInFinder', filePath),
  },

  // Terminal API
  terminal: {
    open: (options: { cwd: string; title?: string; launchClaude?: boolean; sessionId?: string; initialPrompt?: string }) =>
      ipcRenderer.invoke('terminal:open', options),
    close: (windowId: string) => ipcRenderer.invoke('terminal:close', windowId),
    inject: (windowId: string, text: string) => ipcRenderer.invoke('terminal:inject', windowId, text),
  },

  // Dialog API
  dialog: {
    openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  },

  // Claude CLI API - AI-powered features using Claude Max subscription
  claude: {
    query: (request: ClaudeCliRequest) => ipcRenderer.invoke('claude:query', request),
    queryJson: <T>(prompt: string, jsonSchema: string, options?: Partial<ClaudeCliRequest>) =>
      ipcRenderer.invoke('claude:queryJson', { prompt, jsonSchema, options }) as Promise<ClaudeCliResponse<T>>,
    analyzeJourney: (description: string, projectContext?: string) =>
      ipcRenderer.invoke('claude:analyzeJourney', { description, projectContext }) as Promise<ClaudeCliResponse<JourneyAnalysis>>,
    createPlan: (featureDescription: string, techStack: string, existingStructure?: string) =>
      ipcRenderer.invoke('claude:createPlan', { featureDescription, techStack, existingStructure }) as Promise<ClaudeCliResponse<ImplementationPlan>>,
    summarizeJourney: (journeyName: string, gitDiff: string, commitHistory: string, originalPlan?: string) =>
      ipcRenderer.invoke('claude:summarizeJourney', { journeyName, gitDiff, commitHistory, originalPlan }) as Promise<ClaudeCliResponse<JourneySummary>>,
    getStatus: () => ipcRenderer.invoke('claude:getStatus') as Promise<{ queueLength: number; activeRequests: number }>,
    clearQueue: () => ipcRenderer.invoke('claude:clearQueue') as Promise<number>,
  },
})

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      platform: NodeJS.Platform
      history: {
        getProjects: () => Promise<ClaudeProject[]>
        getSessions: (projectId: string) => Promise<ClaudeSession[]>
        getMessages: (filePath: string) => Promise<ClaudeMessage[]>
        openInFinder: (filePath: string) => Promise<void>
      }
      terminal: {
        open: (options: { cwd: string; title?: string; launchClaude?: boolean; sessionId?: string; initialPrompt?: string }) => Promise<string>
        close: (windowId: string) => Promise<void>
        inject: (windowId: string, text: string) => Promise<void>
      }
      dialog: {
        openFolder: () => Promise<string | null>
      }
      claude: {
        query: (request: ClaudeCliRequest) => Promise<ClaudeCliResponse>
        queryJson: <T>(prompt: string, jsonSchema: string, options?: Partial<ClaudeCliRequest>) => Promise<ClaudeCliResponse<T>>
        analyzeJourney: (description: string, projectContext?: string) => Promise<ClaudeCliResponse<JourneyAnalysis>>
        createPlan: (featureDescription: string, techStack: string, existingStructure?: string) => Promise<ClaudeCliResponse<ImplementationPlan>>
        summarizeJourney: (journeyName: string, gitDiff: string, commitHistory: string, originalPlan?: string) => Promise<ClaudeCliResponse<JourneySummary>>
        getStatus: () => Promise<{ queueLength: number; activeRequests: number }>
        clearQueue: () => Promise<number>
      }
    }
  }
}
