import { create } from 'zustand'
import type { ClaudeProject, ClaudeSession, ClaudeMessage } from '../types/history'

interface HistoryState {
  // Data
  projects: ClaudeProject[]
  sessions: ClaudeSession[]
  messages: ClaudeMessage[]

  // UI State
  selectedProjectId: string | null // null means "All Projects"
  selectedSession: ClaudeSession | null
  isLoadingProjects: boolean
  isLoadingSessions: boolean
  isLoadingMessages: boolean
  error: string | null

  // Actions
  loadProjects: () => Promise<void>
  loadSessions: (projectId: string | null) => Promise<void>
  loadMessages: (session: ClaudeSession) => Promise<void>
  selectProject: (projectId: string | null) => void
  selectSession: (session: ClaudeSession | null) => void
  openTerminal: (cwd: string, launchClaude?: boolean, sessionId?: string) => Promise<string | null>
  openSessionInFinder: (filePath: string) => Promise<void>
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  // Initial state
  projects: [],
  sessions: [],
  messages: [],
  selectedProjectId: null,
  selectedSession: null,
  isLoadingProjects: false,
  isLoadingSessions: false,
  isLoadingMessages: false,
  error: null,

  // Load all projects
  loadProjects: async () => {
    set({ isLoadingProjects: true, error: null })
    try {
      const projects = await window.electronAPI.history.getProjects()
      set({ projects, isLoadingProjects: false })

      // Automatically load all sessions after loading projects
      const { loadSessions, selectedProjectId } = get()
      await loadSessions(selectedProjectId)
    } catch (err) {
      set({ error: (err as Error).message, isLoadingProjects: false })
    }
  },

  // Load sessions for a project (or all projects if null)
  loadSessions: async (projectId: string | null) => {
    set({ isLoadingSessions: true, error: null })
    try {
      const { projects } = get()

      if (projectId) {
        // Load sessions for specific project
        const sessions = await window.electronAPI.history.getSessions(projectId)
        set({ sessions, isLoadingSessions: false })
      } else {
        // Load sessions for all projects
        const allSessions: ClaudeSession[] = []
        for (const project of projects) {
          const projectSessions = await window.electronAPI.history.getSessions(project.id)
          allSessions.push(...projectSessions)
        }
        // Sort by timestamp descending
        allSessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        set({ sessions: allSessions, isLoadingSessions: false })
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoadingSessions: false })
    }
  },

  // Load messages for a session
  loadMessages: async (session: ClaudeSession) => {
    set({ isLoadingMessages: true, error: null, selectedSession: session })
    try {
      const messages = await window.electronAPI.history.getMessages(session.filePath)
      set({ messages, isLoadingMessages: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoadingMessages: false })
    }
  },

  // Select a project (triggers session load)
  selectProject: (projectId: string | null) => {
    set({ selectedProjectId: projectId, selectedSession: null, messages: [] })
    get().loadSessions(projectId)
  },

  // Select a session (triggers message load)
  selectSession: (session: ClaudeSession | null) => {
    if (session) {
      get().loadMessages(session)
    } else {
      set({ selectedSession: null, messages: [] })
    }
  },

  // Open a new terminal window
  openTerminal: async (cwd: string, launchClaude = true, sessionId?: string) => {
    try {
      const windowId = await window.electronAPI.terminal.open({
        cwd,
        launchClaude,
        sessionId,
      })
      return windowId
    } catch (err) {
      set({ error: (err as Error).message })
      return null
    }
  },

  // Open session file in Finder
  openSessionInFinder: async (filePath: string) => {
    try {
      await window.electronAPI.history.openInFinder(filePath)
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },
}))
