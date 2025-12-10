import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,

  // IPC methods will be added here as we build features
  // Example:
  // getProjects: () => ipcRenderer.invoke('projects:getAll'),
  // createProject: (data) => ipcRenderer.invoke('projects:create', data),
})

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      platform: NodeJS.Platform
    }
  }
}
