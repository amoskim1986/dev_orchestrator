import { BrowserWindow, app } from 'electron'
import * as path from 'path'

export interface MarkdownViewerData {
  title: string
  content: string
  journeyId?: string
}

class MarkdownViewerWindowManager {
  private windows: Map<string, BrowserWindow> = new Map() // key -> window

  async open(key: string, data: MarkdownViewerData): Promise<void> {
    // Check if this key already has a window open
    const existingWindow = this.windows.get(key)
    if (existingWindow && !existingWindow.isDestroyed()) {
      // Update content and focus
      existingWindow.webContents.send('markdownViewer:update', data)
      existingWindow.focus()
      return
    }

    // Create new window
    const window = new BrowserWindow({
      width: 700,
      height: 800,
      minWidth: 400,
      minHeight: 300,
      title: data.title,
      backgroundColor: '#1a1a1a',
      titleBarStyle: 'hiddenInset',
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    this.windows.set(key, window)

    // Load the markdown viewer page
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || (!app.isPackaged ? 'http://localhost:3010/' : undefined)
    if (devServerUrl) {
      window.loadURL(`${devServerUrl}markdown-viewer.html`)
    } else {
      window.loadFile(path.join(__dirname, '../../dist/markdown-viewer.html'))
    }

    // Send data when page loads
    window.webContents.on('did-finish-load', () => {
      if (!window.isDestroyed()) {
        window.webContents.send('markdownViewer:init', data)
      }
    })

    // Handle window close
    window.on('closed', () => {
      this.windows.delete(key)
    })
  }

  update(key: string, data: MarkdownViewerData): void {
    const window = this.windows.get(key)
    if (window && !window.isDestroyed()) {
      window.webContents.send('markdownViewer:update', data)
    }
  }

  close(key: string): void {
    const window = this.windows.get(key)
    if (window && !window.isDestroyed()) {
      window.close()
    }
    this.windows.delete(key)
  }

  closeAll(): void {
    for (const window of this.windows.values()) {
      if (!window.isDestroyed()) {
        window.close()
      }
    }
    this.windows.clear()
  }
}

export const markdownViewerWindowManager = new MarkdownViewerWindowManager()
