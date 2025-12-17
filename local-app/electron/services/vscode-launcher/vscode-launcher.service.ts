/**
 * VS Code Launcher Service
 * Opens VS Code at a journey's worktree and sends prompts to Claude Code
 */

import { spawn } from 'child_process'
import { promisify } from 'util'
import { exec } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import {
  VSCodeLaunchOptions,
  VSCodeLaunchResult,
  VSCodeStatus,
  JourneyLaunchRequest,
  VSCODE_PATHS,
  VSCODE_INIT_DELAY,
} from './types'
import { buildPromptForJourney } from './prompts'

const execAsync = promisify(exec)

class VSCodeLauncherService {
  private vscodePath: string | null = null
  private initialized = false

  constructor() {
    // Detect VS Code on first use
  }

  /**
   * Detect VS Code installation path
   */
  private async detectVSCode(): Promise<void> {
    if (this.initialized) return

    const platform = process.platform
    const defaultPath = VSCODE_PATHS[platform]
    console.log('[VSCode Launcher] Detecting VS Code on platform:', platform)
    console.log('[VSCode Launcher] Default path to check:', defaultPath)

    // Check if default path exists
    if (defaultPath && fs.existsSync(defaultPath)) {
      console.log('[VSCode Launcher] Found VS Code at default path')
      this.vscodePath = defaultPath
      this.initialized = true
      return
    }

    // Fallback: try to find 'code' in PATH
    try {
      const cmd = platform === 'win32' ? 'where code' : 'which code'
      console.log('[VSCode Launcher] Trying to find code in PATH with:', cmd)
      const { stdout } = await execAsync(cmd)
      const foundPath = stdout.trim().split('\n')[0]
      console.log('[VSCode Launcher] Found in PATH:', foundPath)
      if (foundPath && fs.existsSync(foundPath)) {
        this.vscodePath = foundPath
      }
    } catch (err) {
      console.log('[VSCode Launcher] Not found in PATH:', err)
    }

    console.log('[VSCode Launcher] Final vscodePath:', this.vscodePath)
    this.initialized = true
  }

  /**
   * Get VS Code installation status
   */
  async getStatus(): Promise<VSCodeStatus> {
    await this.detectVSCode()

    if (!this.vscodePath) {
      return { installed: false, executablePath: null, version: null }
    }

    try {
      const { stdout } = await execAsync(`"${this.vscodePath}" --version`)
      const version = stdout.split('\n')[0]
      return {
        installed: true,
        executablePath: this.vscodePath,
        version,
      }
    } catch {
      return { installed: true, executablePath: this.vscodePath, version: null }
    }
  }

  /**
   * Check if a VS Code window is already open for the given folder
   * Returns true if found and focused, false otherwise
   */
  private async findAndFocusExistingWindow(workingDirectory: string): Promise<boolean> {
    if (process.platform !== 'darwin') {
      // Only implemented for macOS currently
      return false
    }

    const folderName = path.basename(workingDirectory)
    console.log('[VSCode Launcher] Checking for existing VS Code window with folder:', folderName)

    try {
      // First check if VS Code is running at all
      const isRunningScript = `
        tell application "System Events"
          return (exists process "Code")
        end tell
      `
      const { stdout: isRunningResult } = await execAsync(`osascript -e '${isRunningScript}'`)
      const isRunning = isRunningResult.trim() === 'true'
      console.log('[VSCode Launcher] VS Code is running:', isRunning)

      if (!isRunning) {
        return false
      }

      // Check if a window with this folder is already open
      const checkScript = `
        tell application "System Events"
          tell process "Code"
            set windowNames to {}
            repeat with w in windows
              set end of windowNames to name of w
            end repeat
            return windowNames as text
          end tell
        end tell
      `
      const { stdout: windowList } = await execAsync(`osascript -e '${checkScript}'`)
      console.log('[VSCode Launcher] VS Code windows:', windowList.trim())

      // Check if any window contains our folder name
      if (windowList.includes(folderName)) {
        console.log('[VSCode Launcher] Found existing window with folder:', folderName)
        // Focus the existing window
        const focusScript = `
          tell application "System Events"
            tell process "Code"
              set frontmost to true
              repeat with w in windows
                if name of w contains "${folderName}" then
                  perform action "AXRaise" of w
                  exit repeat
                end if
              end repeat
            end tell
          end tell
        `
        await execAsync(`osascript -e '${focusScript.replace(/'/g, "'\"'\"'")}'`)
        return true
      }

      console.log('[VSCode Launcher] No existing window found for folder:', folderName)
    } catch (err) {
      console.log('[VSCode Launcher] Error checking for existing window:', err)
    }

    return false
  }

  /**
   * Launch VS Code with options
   */
  async launch(options: VSCodeLaunchOptions): Promise<VSCodeLaunchResult> {
    // On macOS, we use 'open -a' which doesn't need vscodePath
    // On other platforms, we need to detect VS Code first
    if (process.platform !== 'darwin') {
      await this.detectVSCode()
      if (!this.vscodePath) {
        return {
          success: false,
          error: 'VS Code not found. Please install VS Code from https://code.visualstudio.com/',
          workspaceIdentifier: options.workingDirectory,
        }
      }
    }

    // Validate working directory exists
    if (!fs.existsSync(options.workingDirectory)) {
      return {
        success: false,
        error: `Working directory does not exist: ${options.workingDirectory}`,
        workspaceIdentifier: options.workingDirectory,
      }
    }

    try {
      console.log('[VSCode Launcher] Launching VS Code...')
      console.log('[VSCode Launcher] Working directory:', options.workingDirectory)

      // First, check if there's already a VS Code window open for this folder
      const existingWindowFound = await this.findAndFocusExistingWindow(options.workingDirectory)

      if (existingWindowFound) {
        console.log('[VSCode Launcher] Using existing VS Code window')
        // Open Claude Code in the existing window
        if (options.maximizeChat !== false) {
          // Small delay to let the window focus
          setTimeout(() => {
            this.openClaudeCodePanel(options.workingDirectory)
          }, 500)
        }
        return {
          success: true,
          workspaceIdentifier: options.workingDirectory,
        }
      }

      // No existing window found, open a new one
      console.log('[VSCode Launcher] Opening new VS Code window')

      if (process.platform === 'darwin') {
        // On macOS, use the code CLI for better control over new windows
        // The code CLI path in VS Code.app
        const codePath = '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code'
        const newWindowFlag = options.newWindow !== false ? '--new-window' : ''
        const fullCommand = `"${codePath}" ${newWindowFlag} "${options.workingDirectory}"`
        console.log('[VSCode Launcher] Full command:', fullCommand)

        // Use execAsync for better error handling
        try {
          await execAsync(fullCommand)
          console.log('[VSCode Launcher] VS Code opened successfully')
        } catch (openErr) {
          // If the code CLI fails, fall back to 'open' command
          console.log('[VSCode Launcher] code CLI failed, trying open command:', openErr)
          try {
            const fallbackCommand = `open -n -a "Visual Studio Code" "${options.workingDirectory}"`
            console.log('[VSCode Launcher] Fallback command:', fallbackCommand)
            await execAsync(fallbackCommand)
            console.log('[VSCode Launcher] VS Code opened via fallback')
          } catch (fallbackErr) {
            console.error('[VSCode Launcher] Failed to open VS Code:', fallbackErr)
            return {
              success: false,
              error: `Failed to open VS Code: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`,
              workspaceIdentifier: options.workingDirectory,
            }
          }
        }

        // After a delay, try to open Claude Code extension panel
        if (options.maximizeChat !== false) {
          setTimeout(() => {
            this.openClaudeCodePanel(options.workingDirectory)
          }, VSCODE_INIT_DELAY)
        }

        return {
          success: true,
          workspaceIdentifier: options.workingDirectory,
        }
      } else {
        // On other platforms, use the code CLI with spawn
        const quotedPath = `"${this.vscodePath}"`
        const quotedWorkDir = `"${options.workingDirectory}"`
        const args = options.newWindow !== false ? `${quotedWorkDir} --new-window` : quotedWorkDir
        const fullCommand = `${quotedPath} ${args}`

        console.log('[VSCode Launcher] Full command:', fullCommand)

        const vscodeProc = spawn(fullCommand, [], {
          detached: true,
          stdio: 'ignore',
          shell: true,
        })
        vscodeProc.unref()

        const pid = vscodeProc.pid
        console.log('[VSCode Launcher] Spawned with PID:', pid)

        // After a delay, try to open Claude Code extension panel
        if (options.maximizeChat !== false) {
          setTimeout(() => {
            this.openClaudeCodePanel(options.workingDirectory)
          }, VSCODE_INIT_DELAY)
        }

        return {
          success: true,
          vscodePid: pid,
          workspaceIdentifier: options.workingDirectory,
        }
      }
    } catch (error) {
      console.error('[VSCode Launcher] Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        workspaceIdentifier: options.workingDirectory,
      }
    }
  }

  /**
   * Try to open the Claude Code extension panel in VS Code
   * Uses AppleScript on macOS to trigger the Claude Code command palette
   */
  private async openClaudeCodePanel(workingDirectory: string): Promise<void> {
    console.log('[VSCode Launcher] Attempting to open Claude Code panel for:', workingDirectory)

    if (process.platform === 'darwin') {
      try {
        // Get the folder name from the working directory to match the window title
        const folderName = path.basename(workingDirectory)
        console.log('[VSCode Launcher] Looking for VS Code window with folder:', folderName)

        // Use AppleScript to find the correct VS Code window and trigger Claude Code
        // VS Code window titles are formatted as: "folder - Visual Studio Code" or "file - folder - Visual Studio Code"
        const appleScript = `
          tell application "System Events"
            tell process "Code"
              -- Find the window with our folder name in the title
              set targetWindow to missing value
              repeat with w in windows
                if name of w contains "${folderName}" then
                  set targetWindow to w
                  exit repeat
                end if
              end repeat

              -- If we found the window, focus it and open Claude Code
              if targetWindow is not missing value then
                -- Bring the window to front
                set frontmost to true
                perform action "AXRaise" of targetWindow
                delay 0.3

                -- Open command palette (Cmd+Shift+P)
                keystroke "p" using {command down, shift down}
                delay 0.3
                -- Type the Claude Code history command to show past conversations
                keystroke "Claude: History"
                delay 0.5
                -- Press Enter to execute
                keystroke return
              end if
            end tell
          end tell
        `
        await execAsync(`osascript -e '${appleScript.replace(/'/g, "'\"'\"'")}'`)
        console.log('[VSCode Launcher] AppleScript executed to open Claude Code in window:', folderName)
      } catch (err) {
        console.log('[VSCode Launcher] AppleScript failed:', err)
        console.log('[VSCode Launcher] User can open Claude Code from the activity bar or Cmd+Shift+P → "Claude: Open"')
      }
    } else {
      // On other platforms, we can't easily automate this
      console.log('[VSCode Launcher] Auto-opening Claude Code not supported on this platform')
      console.log('[VSCode Launcher] User can open Claude Code from the activity bar or Ctrl+Shift+P → "Claude: Open"')
    }
  }

  /**
   * Launch VS Code for a specific journey (convenience wrapper)
   */
  async launchForJourney(request: JourneyLaunchRequest): Promise<VSCodeLaunchResult> {
    console.log('[VSCode Launcher] launchForJourney called with:', {
      journeyId: request.journeyId,
      journeyName: request.journeyName,
      worktreePath: request.worktreePath,
      projectRootPath: request.projectRootPath,
    })

    const prompt = request.customPrompt || buildPromptForJourney(request)

    // Check for CLAUDE.md to add as context
    const contextFiles: string[] = []
    const claudeMdPath = path.join(request.worktreePath, 'CLAUDE.md')
    if (fs.existsSync(claudeMdPath)) {
      contextFiles.push(claudeMdPath)
    }

    return this.launch({
      workingDirectory: request.worktreePath,
      initialPrompt: prompt,
      chatMode: 'agent',
      contextFiles,
      maximizeChat: true,
      newWindow: true,
    })
  }
}

// Singleton instance
let serviceInstance: VSCodeLauncherService | null = null

export function getVSCodeLauncherService(): VSCodeLauncherService {
  if (!serviceInstance) {
    serviceInstance = new VSCodeLauncherService()
  }
  return serviceInstance
}

export { VSCodeLauncherService }
