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

type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input?: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }

interface ClaudeMessage {
  uuid?: string
  type: 'user' | 'assistant' | 'tool_result'
  timestamp: Date
  content: MessageContent[]
  model?: string
  toolUseResult?: {
    durationMs?: number
    numFiles?: number
    truncated?: boolean
  }
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

// New intake/spec/plan types
interface RefinedIntake {
  title: string
  problem: string
  proposedSolution: string
  userStories: string[]
  acceptanceCriteria: string[]
  outOfScope: string[]
  openQuestions: string[]
}

interface Spec {
  overview: string
  goals: string[]
  nonGoals: string[]
  technicalApproach: {
    summary: string
    components: { name: string; purpose: string; changes: string }[]
  }
  dataModel: {
    newEntities: { name: string; fields: string[] }[]
    modifiedEntities: { name: string; changes: string }[]
  }
  apiChanges: {
    newEndpoints: { method: string; path: string; purpose: string }[]
    modifiedEndpoints: { method: string; path: string; changes: string }[]
  }
  uiChanges: {
    newScreens: { name: string; purpose: string }[]
    modifiedScreens: { name: string; changes: string }[]
  }
  testing: {
    unitTests: string[]
    integrationTests: string[]
    e2eTests: string[]
  }
  rollout: {
    featureFlags: string[]
    migrationSteps: string[]
    rollbackPlan: string
  }
  openQuestions: string[]
}

interface Plan {
  summary: string
  estimatedEffort: 'small' | 'medium' | 'large' | 'x-large'
  phases: {
    name: string
    description: string
    tasks: {
      title: string
      description: string
      estimatedHours: number
      dependencies: string[]
      deliverables: string[]
    }[]
  }[]
  risks: { risk: string; mitigation: string; severity: 'low' | 'medium' | 'high' }[]
  milestones: { name: string; criteria: string }[]
}

type JourneyType = 'feature_planning' | 'feature' | 'bug' | 'investigation'
type JourneyStage = string // Simplified for preload

// VS Code Launcher types
interface VSCodeLaunchOptions {
  workingDirectory: string
  initialPrompt?: string
  chatMode?: 'agent' | 'ask' | 'edit'
  contextFiles?: string[]
  maximizeChat?: boolean
  newWindow?: boolean
}

interface VSCodeLaunchResult {
  success: boolean
  vscodePid?: number
  error?: string
  workspaceIdentifier: string
}

interface VSCodeStatus {
  installed: boolean
  executablePath: string | null
  version: string | null
}

interface JourneyLaunchRequest {
  journeyId: string
  journeyName: string
  journeyType: JourneyType
  journeyStage: JourneyStage
  worktreePath: string
  projectRootPath: string
  customPrompt?: string
}

// Project intake types
interface ProjectIntakeRefinement {
  document: string
}

interface ProjectIntakeUpdate {
  changes_summary: string
  suggested_updates: string
  updated_document: string
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
    // New intake/spec/plan workflow
    refineIntake: (rawIntake: string, journeyType: JourneyType, projectContext?: string) =>
      ipcRenderer.invoke('claude:refineIntake', { rawIntake, journeyType, projectContext }) as Promise<ClaudeCliResponse<RefinedIntake>>,
    generateSpec: (refinedIntake: string, projectContext?: string, techStack?: string) =>
      ipcRenderer.invoke('claude:generateSpec', { refinedIntake, projectContext, techStack }) as Promise<ClaudeCliResponse<Spec>>,
    generatePlan: (spec: string, projectContext?: string) =>
      ipcRenderer.invoke('claude:generatePlan', { spec, projectContext }) as Promise<ClaudeCliResponse<Plan>>,
    // Legacy methods
    analyzeJourney: (description: string, projectContext?: string) =>
      ipcRenderer.invoke('claude:analyzeJourney', { description, projectContext }) as Promise<ClaudeCliResponse<JourneyAnalysis>>,
    createPlan: (featureDescription: string, techStack: string, existingStructure?: string) =>
      ipcRenderer.invoke('claude:createPlan', { featureDescription, techStack, existingStructure }) as Promise<ClaudeCliResponse<ImplementationPlan>>,
    summarizeJourney: (journeyName: string, gitDiff: string, commitHistory: string, originalPlan?: string) =>
      ipcRenderer.invoke('claude:summarizeJourney', { journeyName, gitDiff, commitHistory, originalPlan }) as Promise<ClaudeCliResponse<JourneySummary>>,
    getStatus: () => ipcRenderer.invoke('claude:getStatus') as Promise<{ queueLength: number; activeRequests: number }>,
    clearQueue: () => ipcRenderer.invoke('claude:clearQueue') as Promise<number>,
    // Project intake methods
    refineProjectIntake: (rawIntake: string, projectName: string) =>
      ipcRenderer.invoke('claude:refineProjectIntake', { rawIntake, projectName }) as Promise<ClaudeCliResponse<ProjectIntakeRefinement>>,
    analyzeProjectIntakeChanges: (previousRaw: string, newRaw: string, existingAiDoc: string, projectName: string) =>
      ipcRenderer.invoke('claude:analyzeProjectIntakeChanges', { previousRaw, newRaw, existingAiDoc, projectName }) as Promise<ClaudeCliResponse<ProjectIntakeUpdate>>,
  },

  // VS Code Launcher API - Opens VS Code with Claude Code
  vscode: {
    getStatus: () => ipcRenderer.invoke('vscode:getStatus') as Promise<VSCodeStatus>,
    launch: (options: VSCodeLaunchOptions) =>
      ipcRenderer.invoke('vscode:launch', options) as Promise<VSCodeLaunchResult>,
    launchForJourney: (request: JourneyLaunchRequest) =>
      ipcRenderer.invoke('vscode:launchForJourney', request) as Promise<VSCodeLaunchResult>,
    generatePrompt: (
      type: 'default' | 'resume' | 'review' | 'testing',
      context: JourneyLaunchRequest,
      lastActivity?: string
    ) =>
      ipcRenderer.invoke('vscode:generatePrompt', { type, context, lastActivity }) as Promise<string>,
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
        // New intake/spec/plan workflow
        refineIntake: (rawIntake: string, journeyType: JourneyType, projectContext?: string) => Promise<ClaudeCliResponse<RefinedIntake>>
        generateSpec: (refinedIntake: string, projectContext?: string, techStack?: string) => Promise<ClaudeCliResponse<Spec>>
        generatePlan: (spec: string, projectContext?: string) => Promise<ClaudeCliResponse<Plan>>
        // Legacy methods
        analyzeJourney: (description: string, projectContext?: string) => Promise<ClaudeCliResponse<JourneyAnalysis>>
        createPlan: (featureDescription: string, techStack: string, existingStructure?: string) => Promise<ClaudeCliResponse<ImplementationPlan>>
        summarizeJourney: (journeyName: string, gitDiff: string, commitHistory: string, originalPlan?: string) => Promise<ClaudeCliResponse<JourneySummary>>
        getStatus: () => Promise<{ queueLength: number; activeRequests: number }>
        clearQueue: () => Promise<number>
        // Project intake methods
        refineProjectIntake: (rawIntake: string, projectName: string) => Promise<ClaudeCliResponse<ProjectIntakeRefinement>>
        analyzeProjectIntakeChanges: (previousRaw: string, newRaw: string, existingAiDoc: string, projectName: string) => Promise<ClaudeCliResponse<ProjectIntakeUpdate>>
      }
      vscode: {
        getStatus: () => Promise<VSCodeStatus>
        launch: (options: VSCodeLaunchOptions) => Promise<VSCodeLaunchResult>
        launchForJourney: (request: JourneyLaunchRequest) => Promise<VSCodeLaunchResult>
        generatePrompt: (
          type: 'default' | 'resume' | 'review' | 'testing',
          context: JourneyLaunchRequest,
          lastActivity?: string
        ) => Promise<string>
      }
    }
  }
}
