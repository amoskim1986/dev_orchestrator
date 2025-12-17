import { BrowserWindow, app, screen } from 'electron'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface JourneyOverlayData {
  journeyId: string
  projectId: string
  journeyName: string
  journeyType: string
  journeyStage: string
  branchName?: string
  workspacePath?: string
}

class JourneyOverlayWindowManager {
  private window: BrowserWindow | null = null
  private currentJourney: JourneyOverlayData | null = null
  private registeredJourneys: Map<string, JourneyOverlayData> = new Map() // folderName -> journeyData
  private pollInterval: NodeJS.Timeout | null = null
  private lastFocusedFolder: string | null = null

  /**
   * Register a journey workspace for overlay tracking
   */
  registerJourney(data: JourneyOverlayData & { workspacePath: string }): void {
    const folderName = path.basename(data.workspacePath)
    this.registeredJourneys.set(folderName, data)
    console.log('[Overlay] Registered journey:', folderName, '->', data.journeyName)
  }

  /**
   * Unregister a journey workspace
   */
  unregisterJourney(workspacePath: string): void {
    const folderName = path.basename(workspacePath)
    this.registeredJourneys.delete(folderName)
    console.log('[Overlay] Unregistered journey:', folderName)
  }

  /**
   * Start polling for VS Code window focus changes
   */
  startPolling(): void {
    if (this.pollInterval) return

    // Poll every 1 second
    this.pollInterval = setInterval(() => {
      this.checkVSCodeFocus()
    }, 1000)

    console.log('[Overlay] Started VS Code focus polling')
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
      console.log('[Overlay] Stopped VS Code focus polling')
    }
  }

  /**
   * Check which VS Code window is focused and update overlay
   */
  private async checkVSCodeFocus(): Promise<void> {
    if (process.platform !== 'darwin') return
    if (this.registeredJourneys.size === 0) {
      this.hide()
      return
    }

    try {
      // Check if VS Code is the frontmost app
      const frontAppScript = `
        tell application "System Events"
          set frontApp to name of first application process whose frontmost is true
          return frontApp
        end tell
      `
      const { stdout: frontApp } = await execAsync(`osascript -e '${frontAppScript}'`)
      const isFrontApp = frontApp.trim() === 'Code'

      if (!isFrontApp) {
        // VS Code is not focused, hide overlay
        if (this.lastFocusedFolder !== null) {
          this.lastFocusedFolder = null
          this.hide()
        }
        return
      }

      // Get the focused VS Code window title
      const windowTitleScript = `
        tell application "System Events"
          tell process "Code"
            if (count of windows) > 0 then
              return name of front window
            else
              return ""
            end if
          end tell
        end tell
      `
      const { stdout: windowTitle } = await execAsync(`osascript -e '${windowTitleScript}'`)
      const title = windowTitle.trim()

      if (!title) {
        this.hide()
        return
      }

      // VS Code window titles are like: "filename - folderName - Visual Studio Code"
      // Or just: "folderName - Visual Studio Code"
      // Extract the folder name
      const parts = title.split(' - ')
      let folderName: string | null = null

      if (parts.length >= 2) {
        // Could be "file - folder - VS Code" or "folder - VS Code"
        // The folder is typically the second-to-last part before "Visual Studio Code"
        const vsCodeIndex = parts.findIndex(p => p.includes('Visual Studio Code'))
        if (vsCodeIndex > 0) {
          folderName = parts[vsCodeIndex - 1].trim()
        } else if (parts.length === 2) {
          folderName = parts[0].trim()
        }
      }

      if (!folderName) {
        if (this.lastFocusedFolder !== null) {
          this.lastFocusedFolder = null
          this.hide()
        }
        return
      }

      // Check if this folder is registered
      const journeyData = this.registeredJourneys.get(folderName)

      if (journeyData) {
        // This is a registered journey
        if (this.lastFocusedFolder !== folderName) {
          this.lastFocusedFolder = folderName
          await this.show(journeyData)
        }
      } else {
        // Not a registered journey, hide overlay
        if (this.lastFocusedFolder !== null) {
          this.lastFocusedFolder = null
          this.hide()
        }
      }
    } catch (err) {
      // Silently fail - AppleScript errors are common when switching apps
    }
  }

  async show(data: JourneyOverlayData): Promise<void> {
    this.currentJourney = data

    if (this.window && !this.window.isDestroyed()) {
      // Update existing window
      this.window.webContents.send('overlay:update', data)
      this.window.show()
      return
    }

    // Get primary display dimensions
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth } = primaryDisplay.workAreaSize

    // Create new overlay window - positioned at top-right
    this.window = new BrowserWindow({
      width: 320,
      height: 100,
      x: screenWidth - 340, // 20px from right edge
      y: 20, // 20px from top
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: true,
      hasShadow: true,
      focusable: false, // Don't steal focus from VS Code
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    // Load the overlay page
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || (!app.isPackaged ? 'http://localhost:3010/' : undefined)
    if (devServerUrl) {
      this.window.loadURL(`${devServerUrl}journey-overlay.html`)
    } else {
      this.window.loadFile(path.join(__dirname, '../../dist/journey-overlay.html'))
    }

    // Send data when page loads
    this.window.webContents.on('did-finish-load', () => {
      if (this.currentJourney) {
        this.window?.webContents.send('overlay:init', this.currentJourney)
      }
    })

    // Handle window close
    this.window.on('closed', () => {
      this.window = null
      this.currentJourney = null
    })

    // Start polling when first overlay is shown
    this.startPolling()
  }

  hide(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.hide()
    }
  }

  close(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close()
    }
    this.window = null
    this.currentJourney = null
    this.stopPolling()
    this.registeredJourneys.clear()
    this.lastFocusedFolder = null
  }

  getWindow(): BrowserWindow | null {
    return this.window && !this.window.isDestroyed() ? this.window : null
  }

  getCurrentJourney(): JourneyOverlayData | null {
    return this.currentJourney
  }
}

export const journeyOverlayWindowManager = new JourneyOverlayWindowManager()
