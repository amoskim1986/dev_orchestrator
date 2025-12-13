import { BrowserWindow, app } from 'electron'
import * as path from 'path'

// Helper to generate UUID without external dependency
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

class ProjectDetailWindowManager {
  private windows: Map<string, BrowserWindow> = new Map()
  // Track which project is open in which window
  private projectToWindow: Map<string, string> = new Map()

  async open(projectId: string): Promise<string> {
    // Check if this project already has a window open
    const existingWindowId = this.projectToWindow.get(projectId)
    if (existingWindowId) {
      const existingWindow = this.windows.get(existingWindowId)
      if (existingWindow && !existingWindow.isDestroyed()) {
        // Focus the existing window
        existingWindow.focus()
        return existingWindowId
      }
      // Window was destroyed, clean up the mapping
      this.projectToWindow.delete(projectId)
      this.windows.delete(existingWindowId)
    }

    const id = generateId()

    const window = new BrowserWindow({
      width: 900,
      height: 700,
      minWidth: 600,
      minHeight: 500,
      title: 'Project Details',
      backgroundColor: '#1a1a1a',
      titleBarStyle: 'hiddenInset',
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    this.windows.set(id, window)
    this.projectToWindow.set(projectId, id)

    // Load the project detail page - use VITE_DEV_SERVER_URL env var set by electron-vite
    // In development, electron-vite should set this, but as fallback use !app.isPackaged
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || (!app.isPackaged ? 'http://localhost:3010/' : undefined)
    if (devServerUrl) {
      window.loadURL(`${devServerUrl}project-detail.html`)
    } else {
      window.loadFile(path.join(__dirname, '../../dist/project-detail.html'))
    }

    // Wait for the window to be ready, then send the project ID
    await new Promise<void>((resolve) => {
      window.webContents.once('did-finish-load', () => {
        window.webContents.send('projectDetail:init', { projectId })
        resolve()
      })
    })

    // Handle window close
    window.on('closed', () => {
      this.windows.delete(id)
      this.projectToWindow.delete(projectId)
    })

    return id
  }

  close(id: string): void {
    const window = this.windows.get(id)
    if (window && !window.isDestroyed()) {
      window.close()
    }
    this.windows.delete(id)
    // Also remove from projectToWindow mapping
    for (const [projectId, windowId] of this.projectToWindow) {
      if (windowId === id) {
        this.projectToWindow.delete(projectId)
        break
      }
    }
  }

  getWindow(id: string): BrowserWindow | undefined {
    return this.windows.get(id)
  }

  closeAll(): void {
    for (const [id, window] of this.windows) {
      if (!window.isDestroyed()) {
        window.close()
      }
      this.windows.delete(id)
    }
    this.projectToWindow.clear()
  }
}

export const projectDetailWindowManager = new ProjectDetailWindowManager()
