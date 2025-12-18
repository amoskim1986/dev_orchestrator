import { BrowserWindow, app, Menu } from 'electron'
import * as path from 'path'

// Create a minimal menu with standard shortcuts for detail windows
function createDetailWindowMenu(): Menu {
  const isMac = process.platform === 'darwin'
  return Menu.buildFromTemplate([
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        { role: isMac ? 'close' as const : 'quit' as const },
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const },
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const },
        ] : [
          { role: 'close' as const },
        ]),
      ]
    },
  ])
}

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

    // Set menu for this window (enables Cmd+W to close)
    const menu = createDetailWindowMenu()
    this.window.on('focus', () => {
      Menu.setApplicationMenu(menu)
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

  /**
   * Switch to a specific journey tab if it's open
   * Called from overlay manager when VS Code focus changes
   */
  focusJourneyTab(journeyId: string): boolean {
    console.log('[JourneyDetail] focusJourneyTab called:', journeyId, '| Open journeys:', Array.from(this.openJourneys.keys()))

    if (!this.openJourneys.has(journeyId)) {
      console.log('[JourneyDetail] Tab not open for journey:', journeyId)
      return false // Tab not open
    }

    if (this.window && !this.window.isDestroyed()) {
      console.log('[JourneyDetail] Sending focusTab event for:', journeyId)
      this.window.webContents.send('journeyDetail:focusTab', { journeyId })
      return true
    }
    console.log('[JourneyDetail] Window not available')
    return false
  }

  /**
   * Check if a journey tab is currently open
   */
  hasJourneyTab(journeyId: string): boolean {
    return this.openJourneys.has(journeyId)
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
