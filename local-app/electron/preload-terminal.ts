import { contextBridge, ipcRenderer } from 'electron'

// Terminal-specific preload script
contextBridge.exposeInMainWorld('terminalAPI', {
  // Receive terminal initialization data
  onInit: (callback: (data: { id: string; cwd: string }) => void) => {
    ipcRenderer.on('terminal:init', (_event, data) => callback(data))
  },

  // Receive PTY output data
  onData: (callback: (id: string, data: string) => void) => {
    ipcRenderer.on('pty:data', (_event, id, data) => callback(id, data))
  },

  // Receive PTY exit event
  onExit: (callback: (id: string, exitCode: number) => void) => {
    ipcRenderer.on('pty:exit', (_event, id, exitCode) => callback(id, exitCode))
  },

  // Send input to PTY
  sendInput: (id: string, data: string) => {
    ipcRenderer.send('pty:input', id, data)
  },

  // Send resize event to PTY
  resize: (id: string, cols: number, rows: number) => {
    ipcRenderer.send('pty:resize', id, cols, rows)
  },
})

// Type definitions
declare global {
  interface Window {
    terminalAPI: {
      onInit: (callback: (data: { id: string; cwd: string }) => void) => void
      onData: (callback: (id: string, data: string) => void) => void
      onExit: (callback: (id: string, exitCode: number) => void) => void
      sendInput: (id: string, data: string) => void
      resize: (id: string, cols: number, rows: number) => void
    }
  }
}
