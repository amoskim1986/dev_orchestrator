import { BrowserWindow, app } from 'electron'
import * as path from 'path'

export interface JourneyTabData {
  journeyId: string
  projectId: string
}

class JourneyDetailWindowManager {
  private window: BrowserWindow | null = null
  private openJourneys: Set<string> = new Set()

  async open(journeyId: string, projectId: string): Promise<void> {
    // Check if this journey is already open
    if (this.openJourneys.has(journeyId)) {
      // Just focus the window and switch to that tab
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send('journeyDetail:focusTab', { journeyId })
        this.window.focus()
      }
      return
    }

    if (this.window && !this.window.isDestroyed()) {
      // Window exists - add a new tab
      this.window.webContents.send('journeyDetail:addTab', { journeyId, projectId })
      this.window.focus()
      this.openJourneys.add(journeyId)
      return
    }

    // Create new window
    this.window = new BrowserWindow({
      width: 1000,
      height: 800,
      minWidth: 700,
      minHeight: 500,
      title: 'Journey Details',
      backgroundColor: '#1a1a1a',
      titleBarStyle: 'hiddenInset',
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    // Load the journey detail page
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || (!app.isPackaged ? 'http://localhost:3010/' : undefined)
    if (devServerUrl) {
      this.window.loadURL(`${devServerUrl}journey-detail.html`)
    } else {
      this.window.loadFile(path.join(__dirname, '../../dist/journey-detail.html'))
    }

    // Wait for the window to be ready, then send the initial journey
    await new Promise<void>((resolve) => {
      this.window!.webContents.once('did-finish-load', () => {
        this.window!.webContents.send('journeyDetail:init', { journeyId, projectId })
        resolve()
      })
    })

    this.openJourneys.add(journeyId)

    // Handle window close
    this.window.on('closed', () => {
      this.window = null
      this.openJourneys.clear()
    })
  }

  closeTab(journeyId: string): void {
    this.openJourneys.delete(journeyId)

    // If no more tabs, close the window
    if (this.openJourneys.size === 0 && this.window && !this.window.isDestroyed()) {
      this.window.close()
    }
  }

  getWindow(): BrowserWindow | null {
    return this.window && !this.window.isDestroyed() ? this.window : null
  }

  closeAll(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close()
    }
    this.window = null
    this.openJourneys.clear()
  }
}

export const journeyDetailWindowManager = new JourneyDetailWindowManager()
