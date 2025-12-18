import { BrowserWindow, app, screen } from 'electron'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface JourneyOverlayData {
  journeyId: string
  projectId: string
  projectName: string
  journeyName: string
  journeyType: string
  journeyStage: string
  branchName?: string
  workspacePath?: string
}

export interface ProjectOverlayData {
  projectId: string
  projectName: string
  rootPath: string
}

class JourneyOverlayWindowManager {
  private window: BrowserWindow | null = null
  private currentJourney: JourneyOverlayData | null = null
  private registeredJourneys: Map<string, JourneyOverlayData> = new Map() // folderName -> journeyData
  private registeredProjects: Map<string, ProjectOverlayData> = new Map() // folderName -> projectData
  private pollInterval: NodeJS.Timeout | null = null
  private lastFocusedFolder: string | null = null

  /**
   * Register a journey workspace for overlay tracking
   */
  registerJourney(data: JourneyOverlayData & { workspacePath: string }): void {
    const folderName = path.basename(data.workspacePath)
    this.registeredJourneys.set(folderName, data)
    // console.log('[Overlay] Registered journey:', folderName, '->', data.journeyName)
  }

  /**
   * Unregister a journey workspace
   */
  unregisterJourney(workspacePath: string): void {
    const folderName = path.basename(workspacePath)
    this.registeredJourneys.delete(folderName)
    // console.log('[Overlay] Unregistered journey:', folderName)
  }

  /**
   * Register a project for overlay tracking (for main branch / non-journey workspaces)
   */
  registerProject(data: ProjectOverlayData): void {
    const folderName = path.basename(data.rootPath)
    this.registeredProjects.set(folderName, data)
    // console.log('[Overlay] Registered project:', folderName, '->', data.projectName)
  }

  /**
   * Unregister a project
   */
  unregisterProject(rootPath: string): void {
    const folderName = path.basename(rootPath)
    this.registeredProjects.delete(folderName)
    // console.log('[Overlay] Unregistered project:', folderName)
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

    // console.log('[Overlay] Started VS Code focus polling')
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
      // console.log('[Overlay] Stopped VS Code focus polling')
    }
  }

  /**
   * Check which VS Code window is focused and update overlay
   */
  private async checkVSCodeFocus(): Promise<void> {
    if (process.platform !== 'darwin') return

    try {
      // Try both VS Code and Cursor - query their windows directly
      // This works even if our overlay is "on top" because we query the app's windows directly
      let title = ''
      let processName = ''

      // Try VS Code first
      const vsCodeScript = `
        tell application "System Events"
          if exists process "Code" then
            tell process "Code"
              if (count of windows) > 0 then
                return name of front window
              end if
            end tell
          end if
          return ""
        end tell
      `
      const { stdout: vsCodeTitle } = await execAsync(`osascript -e '${vsCodeScript}'`)
      if (vsCodeTitle.trim()) {
        title = vsCodeTitle.trim()
        processName = 'Code'
      }

      // Try Cursor if VS Code didn't have windows
      if (!title) {
        const cursorScript = `
          tell application "System Events"
            if exists process "Cursor" then
              tell process "Cursor"
                if (count of windows) > 0 then
                  return name of front window
                end if
              end tell
            end if
            return ""
          end tell
        `
        const { stdout: cursorTitle } = await execAsync(`osascript -e '${cursorScript}'`)
        if (cursorTitle.trim()) {
          title = cursorTitle.trim()
          processName = 'Cursor'
        }
      }

      // console.log('[Overlay] ---- VS Code Focus Check ----')
      // console.log('[Overlay] VS Code/Cursor window title:', title || '(none)', '| Process:', processName || '(none)')

      if (!title) {
        // No title - probably no VS Code window open, but keep overlay visible
        // console.log('[Overlay] No VS Code window title - keeping current state')
        return
      }

      // Window title formats to handle:
      // - VS Code (folder only): "folder_name" (no dashes when no file is open)
      // - VS Code (modern): "tab_name — folder_name" (uses em-dash —)
      // - VS Code (classic): "filename - folderName - Visual Studio Code"
      // - Cursor: "filename - folderName - Cursor"
      // - Claude Code: "Claude Code — folderName" (uses em-dash —)
      let folderName: string | null = null

      // Check for em-dash format first (modern VS Code, Claude Code, Cursor)
      // Format: "something — folder_name" or "Claude Code — folder_name"
      if (title.includes('—') || title.includes('–')) {
        // Split by em-dash or en-dash and take the last part as folder name
        const emDashParts = title.split(/\s*[—–]\s*/)
        if (emDashParts.length >= 2) {
          // The folder name is the last part (may have " | Process" suffix in logs, but not in actual title)
          folderName = emDashParts[emDashParts.length - 1].trim()
        }
      } else if (title.includes(' - ')) {
        // Standard VS Code/Cursor format with regular dashes
        const parts = title.split(' - ')
        if (parts.length >= 2) {
          // Could be "file - folder - VS Code" or "folder - VS Code"
          // The folder is typically the second-to-last part before "Visual Studio Code" or "Cursor"
          const vsCodeIndex = parts.findIndex(p => p.includes('Visual Studio Code') || p.includes('Cursor'))
          if (vsCodeIndex > 0) {
            folderName = parts[vsCodeIndex - 1].trim()
          } else if (parts.length === 2) {
            folderName = parts[0].trim()
          }
        }
      } else {
        // No dashes at all - title might just be the folder name itself
        // This happens when VS Code opens a folder with no file tabs open
        const trimmed = title.trim()
        // Accept as folder name if it doesn't contain path separators
        // Folder names can contain spaces, underscores, etc.
        if (trimmed && !trimmed.includes('/') && !trimmed.includes('\\')) {
          folderName = trimmed
        }
      }

      // const registeredJourneyKeys = Array.from(this.registeredJourneys.keys())
      // const registeredProjectKeys = Array.from(this.registeredProjects.keys())
      // console.log('[Overlay] Extracted folder name:', folderName)
      // console.log('[Overlay] Registered journeys:', registeredJourneyKeys)
      // console.log('[Overlay] Registered projects:', registeredProjectKeys)
      // console.log('[Overlay] Last focused folder:', this.lastFocusedFolder)

      // Use folder name or full title as identifier
      const identifier = folderName || title

      // Check if this folder is a registered journey
      const journeyData = folderName ? this.registeredJourneys.get(folderName) : null
      // Check if this folder is a registered project (main branch)
      const projectData = folderName ? this.registeredProjects.get(folderName) : null

      // console.log('[Overlay] Journey match:', journeyData ? journeyData.journeyName : 'NO MATCH')
      // console.log('[Overlay] Project match:', projectData ? projectData.projectName : 'NO MATCH')

      if (journeyData) {
        // This is a registered journey - just update overlay (don't steal focus)
        if (this.lastFocusedFolder !== identifier) {
          // console.log('[Overlay] === FOLDER CHANGED - switching to journey:', journeyData.journeyName, '===')
          this.lastFocusedFolder = identifier
          await this.show(journeyData)
        }
      } else if (projectData) {
        // This is a registered project (main branch, no active journey)
        if (this.lastFocusedFolder !== identifier) {
          // console.log('[Overlay] === FOLDER CHANGED - switching to project:', projectData.projectName, '===')
          this.lastFocusedFolder = identifier
          await this.showProjectOnly(projectData)
        }
      } else {
        // Not a registered journey or project, show "no journey" state
        if (this.lastFocusedFolder !== identifier) {
          this.lastFocusedFolder = identifier
          await this.showNoJourney(folderName || 'Unknown workspace')
        }
      }
    } catch (err) {
      console.error('[Overlay] Error checking VS Code focus:', err)
      // Silently fail - AppleScript errors are common when switching apps
    }
  }

  async show(data: JourneyOverlayData): Promise<void> {
    this.currentJourney = data

    if (this.window && !this.window.isDestroyed()) {
      // Update existing window content only - don't call show() as it steals focus
      this.window.webContents.send('overlay:update', data)
      return
    }

    // Get primary display dimensions
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth } = primaryDisplay.workAreaSize

    // Create new overlay window - positioned at top-right
    this.window = new BrowserWindow({
      width: 320,
      height: 120,
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

  async showNoJourney(folderName: string): Promise<void> {
    this.currentJourney = null

    if (this.window && !this.window.isDestroyed()) {
      // Update existing window content only - don't call show() as it steals focus
      this.window.webContents.send('overlay:noJourney', { folderName })
      return
    }

    // Create window if needed (same setup as show())
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth } = primaryDisplay.workAreaSize

    this.window = new BrowserWindow({
      width: 320,
      height: 120,
      x: screenWidth - 340,
      y: 20,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: true,
      hasShadow: true,
      focusable: false,
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    const devServerUrl = process.env.VITE_DEV_SERVER_URL || (!app.isPackaged ? 'http://localhost:3010/' : undefined)
    if (devServerUrl) {
      this.window.loadURL(`${devServerUrl}journey-overlay.html`)
    } else {
      this.window.loadFile(path.join(__dirname, '../../dist/journey-overlay.html'))
    }

    this.window.webContents.on('did-finish-load', () => {
      this.window?.webContents.send('overlay:noJourney', { folderName })
    })

    this.window.on('closed', () => {
      this.window = null
      this.currentJourney = null
    })

    this.startPolling()
  }

  async showProjectOnly(data: ProjectOverlayData): Promise<void> {
    this.currentJourney = null

    if (this.window && !this.window.isDestroyed()) {
      // Update existing window content only - don't call show() as it steals focus
      this.window.webContents.send('overlay:projectOnly', data)
      return
    }

    // Create window if needed (same setup as show())
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth } = primaryDisplay.workAreaSize

    this.window = new BrowserWindow({
      width: 320,
      height: 120,
      x: screenWidth - 340,
      y: 20,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: true,
      hasShadow: true,
      focusable: false,
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    const devServerUrl = process.env.VITE_DEV_SERVER_URL || (!app.isPackaged ? 'http://localhost:3010/' : undefined)
    if (devServerUrl) {
      this.window.loadURL(`${devServerUrl}journey-overlay.html`)
    } else {
      this.window.loadFile(path.join(__dirname, '../../dist/journey-overlay.html'))
    }

    this.window.webContents.on('did-finish-load', () => {
      this.window?.webContents.send('overlay:projectOnly', data)
    })

    this.window.on('closed', () => {
      this.window = null
      this.currentJourney = null
    })

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
    this.registeredProjects.clear()
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
