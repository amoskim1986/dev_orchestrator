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
  },

  // Terminal API
  terminal: {
    open: (options: { cwd: string; title?: string; launchClaude?: boolean; sessionId?: string; initialPrompt?: string }) =>
      ipcRenderer.invoke('terminal:open', options),
    close: (windowId: string) => ipcRenderer.invoke('terminal:close', windowId),
    inject: (windowId: string, text: string) => ipcRenderer.invoke('terminal:inject', windowId, text),
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
      }
      terminal: {
        open: (options: { cwd: string; title?: string; launchClaude?: boolean; sessionId?: string; initialPrompt?: string }) => Promise<string>
        close: (windowId: string) => Promise<void>
        inject: (windowId: string, text: string) => Promise<void>
      }
    }
  }
}
