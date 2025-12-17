import { BrowserWindow, app } from 'electron'
import * as path from 'path'

export interface JourneyTabData {
  journeyId: string
  projectId: string
}

class JourneyDetailWindowManager {
  private window: BrowserWindow | null = null
  private openJourneys: Map<string, string> = new Map() // journeyId -> projectId

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
      this.openJourneys.set(journeyId, projectId)
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

    // Store this journey
    this.openJourneys.set(journeyId, projectId)

    // Load the journey detail page
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || (!app.isPackaged ? 'http://localhost:3010/' : undefined)
    if (devServerUrl) {
      this.window.loadURL(`${devServerUrl}journey-detail.html`)
    } else {
      this.window.loadFile(path.join(__dirname, '../../dist/journey-detail.html'))
    }

    // Send state when page loads (handles both initial load and refresh)
    this.window.webContents.on('did-finish-load', () => {
      this.sendCurrentState()
    })

    // Handle window close
    this.window.on('closed', () => {
      this.window = null
      this.openJourneys.clear()
    })
  }

  /**
   * Re-send the current state to the window (used on refresh)
   */
  private sendCurrentState(): void {
    if (!this.window || this.window.isDestroyed()) return

    const journeys = Array.from(this.openJourneys.entries())
    if (journeys.length === 0) return

    // Send the first journey as init
    const [firstJourneyId, firstProjectId] = journeys[0]
    this.window.webContents.send('journeyDetail:init', {
      journeyId: firstJourneyId,
      projectId: firstProjectId,
    })

    // Send the rest as addTab
    for (let i = 1; i < journeys.length; i++) {
      const [journeyId, projectId] = journeys[i]
      this.window.webContents.send('journeyDetail:addTab', { journeyId, projectId })
    }
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
