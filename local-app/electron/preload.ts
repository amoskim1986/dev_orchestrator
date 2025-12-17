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

interface ProposedJourneysResult {
  journeys: {
    name: string
    description: string
    early_plan: string
  }[]
}

interface ProposedChildJourneysResult {
  journeys: {
    name: string
    description: string
    early_plan: string
    checklist_items: string[]
  }[]
}

interface ParsedJourneyIdea {
  name: string
  description: string
  early_plan: string
  type: 'feature_planning' | 'feature' | 'bug' | 'investigation'
}

// Git types
interface GitWorktree {
  path: string
  branch: string
  commit: string
  isMain: boolean
}

interface GitStatus {
  branch: string
  ahead: number
  behind: number
  isClean: boolean
  modified: number
  staged: number
  untracked: number
}

interface CreateWorktreeResult {
  success: boolean
  worktreePath: string
  branchName: string
  error?: string
}

interface RemoveWorktreeResult {
  success: boolean
  error?: string
}

// Transcription types
interface TranscriptionSession {
  id: string
  title: string | null
  raw_transcript: string
  formatted_transcript: string | null
  status: 'recording' | 'complete' | 'formatting'
  duration_seconds: number
  started_at: string
  ended_at: string | null
  created_at: string
  updated_at: string
}

type TranscriptionSessionInsert = Partial<Omit<TranscriptionSession, 'id' | 'created_at' | 'updated_at'>>
type TranscriptionSessionUpdate = Partial<Omit<TranscriptionSession, 'id' | 'created_at'>>

interface TranscriptionIndexEntry {
  id: string
  title: string | null
  status: TranscriptionSession['status']
  duration_seconds: number
  created_at: string
  preview: string
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,

  // Project Detail Window API
  projectDetail: {
    onInit: (callback: (data: { projectId: string }) => void) => {
      ipcRenderer.on('projectDetail:init', (_event, data) => callback(data))
    },
    open: (projectId: string) => ipcRenderer.invoke('projectDetail:open', projectId),
  },

  // Journey Detail Window API
  journeyDetail: {
    onInit: (callback: (data: { journeyId: string; projectId: string }) => void) => {
      ipcRenderer.on('journeyDetail:init', (_event, data) => callback(data))
    },
    onAddTab: (callback: (data: { journeyId: string; projectId: string }) => void) => {
      ipcRenderer.on('journeyDetail:addTab', (_event, data) => callback(data))
    },
    onFocusTab: (callback: (data: { journeyId: string }) => void) => {
      ipcRenderer.on('journeyDetail:focusTab', (_event, data) => callback(data))
    },
    open: (journeyId: string, projectId: string) =>
      ipcRenderer.invoke('journeyDetail:open', journeyId, projectId),
    closeTab: (journeyId: string) =>
      ipcRenderer.invoke('journeyDetail:closeTab', journeyId),
  },

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
    generateSpec: (refinedIntake: string, projectContext?: string, techStack?: string, workingDirectory?: string) =>
      ipcRenderer.invoke('claude:generateSpec', { refinedIntake, projectContext, techStack, workingDirectory }) as Promise<ClaudeCliResponse<Spec>>,
    refineSpec: (currentSpec: string, feedback: string, workingDirectory?: string) =>
      ipcRenderer.invoke('claude:refineSpec', { currentSpec, feedback, workingDirectory }) as Promise<ClaudeCliResponse<Spec>>,
    generatePlan: (spec: string, projectContext?: string, workingDirectory?: string) =>
      ipcRenderer.invoke('claude:generatePlan', { spec, projectContext, workingDirectory }) as Promise<ClaudeCliResponse<Plan>>,
    refinePlan: (currentPlan: string, feedback: string, workingDirectory?: string) =>
      ipcRenderer.invoke('claude:refinePlan', { currentPlan, feedback, workingDirectory }) as Promise<ClaudeCliResponse<Plan>>,
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
    // Proposed journeys methods
    generateProposedJourneys: (aiParsedIntake: string, projectName: string, existingProposals?: { name: string; description: string; status: string }[], codebasePath?: string) =>
      ipcRenderer.invoke('claude:generateProposedJourneys', { aiParsedIntake, projectName, existingProposals, codebasePath }) as Promise<ClaudeCliResponse<ProposedJourneysResult>>,
    // Proposed child journeys methods (for feature_planning journeys)
    generateProposedChildJourneys: (spec: string, journeyName: string, existingProposals?: { name: string; description: string; status: string }[], codebasePath?: string) =>
      ipcRenderer.invoke('claude:generateProposedChildJourneys', { spec, journeyName, existingProposals, codebasePath }) as Promise<ClaudeCliResponse<ProposedChildJourneysResult>>,
    // Journey idea parsing methods
    parseJourneyIdea: (rawText: string, projectName: string) =>
      ipcRenderer.invoke('claude:parseJourneyIdea', { rawText, projectName }) as Promise<ClaudeCliResponse<ParsedJourneyIdea>>,
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

  // Git API - Worktree management for journeys
  git: {
    isRepo: (projectPath: string) =>
      ipcRenderer.invoke('git:isRepo', projectPath) as Promise<boolean>,
    init: (projectPath: string) =>
      ipcRenderer.invoke('git:init', projectPath) as Promise<{ success: boolean; error?: string }>,
    getDefaultBranch: (projectPath: string) =>
      ipcRenderer.invoke('git:getDefaultBranch', projectPath) as Promise<string>,
    listWorktrees: (projectPath: string) =>
      ipcRenderer.invoke('git:listWorktrees', projectPath) as Promise<GitWorktree[]>,
    createWorktree: (options: { projectPath: string; journeyName: string }) =>
      ipcRenderer.invoke('git:createWorktree', options) as Promise<CreateWorktreeResult>,
    removeWorktree: (options: { projectPath: string; worktreePath: string }) =>
      ipcRenderer.invoke('git:removeWorktree', options) as Promise<RemoveWorktreeResult>,
    getStatus: (worktreePath: string) =>
      ipcRenderer.invoke('git:getStatus', worktreePath) as Promise<GitStatus | null>,
    getCurrentBranch: (worktreePath: string) =>
      ipcRenderer.invoke('git:getCurrentBranch', worktreePath) as Promise<string | null>,
  },

  // Transcriptions API - Local file-based speech-to-text session storage
  transcriptions: {
    getStoragePath: () =>
      ipcRenderer.invoke('transcriptions:getStoragePath') as Promise<string>,
    list: () =>
      ipcRenderer.invoke('transcriptions:list') as Promise<TranscriptionIndexEntry[]>,
    get: (id: string) =>
      ipcRenderer.invoke('transcriptions:get', id) as Promise<TranscriptionSession | null>,
    create: (data: TranscriptionSessionInsert) =>
      ipcRenderer.invoke('transcriptions:create', data) as Promise<TranscriptionSession>,
    update: (id: string, updates: TranscriptionSessionUpdate) =>
      ipcRenderer.invoke('transcriptions:update', id, updates) as Promise<TranscriptionSession | null>,
    delete: (id: string) =>
      ipcRenderer.invoke('transcriptions:delete', id) as Promise<boolean>,
    recoverCrashed: () =>
      ipcRenderer.invoke('transcriptions:recoverCrashed') as Promise<string[]>,
  },

  // Journey Overlay API - Floating overlay for active journeys
  overlay: {
    onInit: (callback: (data: JourneyOverlayData) => void) => {
      ipcRenderer.on('overlay:init', (_event, data) => callback(data))
    },
    onUpdate: (callback: (data: JourneyOverlayData) => void) => {
      ipcRenderer.on('overlay:update', (_event, data) => callback(data))
    },
    show: (data: JourneyOverlayData) =>
      ipcRenderer.invoke('overlay:show', data) as Promise<{ success: boolean }>,
    hide: () =>
      ipcRenderer.invoke('overlay:hide') as Promise<{ success: boolean }>,
    close: () =>
      ipcRenderer.invoke('overlay:close') as Promise<{ success: boolean }>,
    openJourneyDetail: (journeyId: string, projectId: string) =>
      ipcRenderer.invoke('overlay:openJourneyDetail', journeyId, projectId) as Promise<{ success: boolean }>,
  },

  // Markdown Viewer API - Opens markdown content in a new window
  markdownViewer: {
    onInit: (callback: (data: MarkdownViewerData) => void) => {
      ipcRenderer.on('markdownViewer:init', (_event, data) => callback(data))
    },
    onUpdate: (callback: (data: MarkdownViewerData) => void) => {
      ipcRenderer.on('markdownViewer:update', (_event, data) => callback(data))
    },
    open: (key: string, data: MarkdownViewerData) =>
      ipcRenderer.invoke('markdownViewer:open', key, data) as Promise<void>,
    update: (key: string, data: MarkdownViewerData) =>
      ipcRenderer.invoke('markdownViewer:update', key, data) as Promise<void>,
    close: (key: string) =>
      ipcRenderer.invoke('markdownViewer:close', key) as Promise<void>,
  },
})

// Journey overlay data type
interface JourneyOverlayData {
  journeyId: string
  projectId: string
  journeyName: string
  journeyType: string
  journeyStage: string
  branchName?: string
  workspacePath?: string
}

// Markdown viewer data type
interface MarkdownViewerData {
  title: string
  content: string
  journeyId?: string
}

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      platform: NodeJS.Platform
      projectDetail: {
        onInit: (callback: (data: { projectId: string }) => void) => void
        open: (projectId: string) => Promise<string>
      }
      journeyDetail: {
        onInit: (callback: (data: { journeyId: string; projectId: string }) => void) => void
        onAddTab: (callback: (data: { journeyId: string; projectId: string }) => void) => void
        onFocusTab: (callback: (data: { journeyId: string }) => void) => void
        open: (journeyId: string, projectId: string) => Promise<void>
        closeTab: (journeyId: string) => Promise<void>
      }
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
        generateSpec: (refinedIntake: string, projectContext?: string, techStack?: string, workingDirectory?: string) => Promise<ClaudeCliResponse<Spec>>
        refineSpec: (currentSpec: string, feedback: string, workingDirectory?: string) => Promise<ClaudeCliResponse<Spec>>
        generatePlan: (spec: string, projectContext?: string, workingDirectory?: string) => Promise<ClaudeCliResponse<Plan>>
        refinePlan: (currentPlan: string, feedback: string, workingDirectory?: string) => Promise<ClaudeCliResponse<Plan>>
        // Legacy methods
        analyzeJourney: (description: string, projectContext?: string) => Promise<ClaudeCliResponse<JourneyAnalysis>>
        createPlan: (featureDescription: string, techStack: string, existingStructure?: string) => Promise<ClaudeCliResponse<ImplementationPlan>>
        summarizeJourney: (journeyName: string, gitDiff: string, commitHistory: string, originalPlan?: string) => Promise<ClaudeCliResponse<JourneySummary>>
        getStatus: () => Promise<{ queueLength: number; activeRequests: number }>
        clearQueue: () => Promise<number>
        // Project intake methods
        refineProjectIntake: (rawIntake: string, projectName: string) => Promise<ClaudeCliResponse<ProjectIntakeRefinement>>
        analyzeProjectIntakeChanges: (previousRaw: string, newRaw: string, existingAiDoc: string, projectName: string) => Promise<ClaudeCliResponse<ProjectIntakeUpdate>>
        // Proposed journeys methods
        generateProposedJourneys: (aiParsedIntake: string, projectName: string, existingProposals?: { name: string; description: string; status: string }[], codebasePath?: string) => Promise<ClaudeCliResponse<ProposedJourneysResult>>
        // Proposed child journeys methods (for feature_planning journeys)
        generateProposedChildJourneys: (spec: string, journeyName: string, existingProposals?: { name: string; description: string; status: string }[], codebasePath?: string) => Promise<ClaudeCliResponse<ProposedChildJourneysResult>>
        // Journey idea parsing methods
        parseJourneyIdea: (rawText: string, projectName: string) => Promise<ClaudeCliResponse<ParsedJourneyIdea>>
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
      git: {
        isRepo: (projectPath: string) => Promise<boolean>
        init: (projectPath: string) => Promise<{ success: boolean; error?: string }>
        getDefaultBranch: (projectPath: string) => Promise<string>
        listWorktrees: (projectPath: string) => Promise<GitWorktree[]>
        createWorktree: (options: { projectPath: string; journeyName: string }) => Promise<CreateWorktreeResult>
        removeWorktree: (options: { projectPath: string; worktreePath: string }) => Promise<RemoveWorktreeResult>
        getStatus: (worktreePath: string) => Promise<GitStatus | null>
        getCurrentBranch: (worktreePath: string) => Promise<string | null>
      }
      transcriptions: {
        getStoragePath: () => Promise<string>
        list: () => Promise<TranscriptionIndexEntry[]>
        get: (id: string) => Promise<TranscriptionSession | null>
        create: (data: TranscriptionSessionInsert) => Promise<TranscriptionSession>
        update: (id: string, updates: TranscriptionSessionUpdate) => Promise<TranscriptionSession | null>
        delete: (id: string) => Promise<boolean>
        recoverCrashed: () => Promise<string[]>
      }
      overlay: {
        onInit: (callback: (data: JourneyOverlayData) => void) => void
        onUpdate: (callback: (data: JourneyOverlayData) => void) => void
        show: (data: JourneyOverlayData) => Promise<{ success: boolean }>
        hide: () => Promise<{ success: boolean }>
        close: () => Promise<{ success: boolean }>
        openJourneyDetail: (journeyId: string, projectId: string) => Promise<{ success: boolean }>
      }
      markdownViewer: {
        onInit: (callback: (data: MarkdownViewerData) => void) => void
        onUpdate: (callback: (data: MarkdownViewerData) => void) => void
        open: (key: string, data: MarkdownViewerData) => Promise<void>
        update: (key: string, data: MarkdownViewerData) => Promise<void>
        close: (key: string) => Promise<void>
      }
    }
  }
}
