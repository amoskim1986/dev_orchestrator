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
  VSCODE_RETRY_DELAY,
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

    // Check if default path exists
    if (defaultPath && fs.existsSync(defaultPath)) {
      this.vscodePath = defaultPath
      this.initialized = true
      return
    }

    // Fallback: try to find 'code' in PATH
    try {
      const cmd = platform === 'win32' ? 'where code' : 'which code'
      const { stdout } = await execAsync(cmd)
      const foundPath = stdout.trim().split('\n')[0]
      if (foundPath && fs.existsSync(foundPath)) {
        this.vscodePath = foundPath
      }
    } catch {
      // Not found in PATH
    }

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
   * Launch VS Code with options
   */
  async launch(options: VSCodeLaunchOptions): Promise<VSCodeLaunchResult> {
    await this.detectVSCode()

    if (!this.vscodePath) {
      return {
        success: false,
        error: 'VS Code not found. Please install VS Code from https://code.visualstudio.com/',
        workspaceIdentifier: options.workingDirectory,
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
      // Step 1: Open VS Code at the working directory
      const vscodeArgs = [options.workingDirectory]
      if (options.newWindow !== false) {
        vscodeArgs.push('--new-window')
      }

      const vscodeProc = spawn(this.vscodePath, vscodeArgs, {
        detached: true,
        stdio: 'ignore',
        shell: true,
      })
      vscodeProc.unref()

      const pid = vscodeProc.pid

      // Step 2: Send initial prompt via `code chat` if provided
      if (options.initialPrompt) {
        await this.sleep(VSCODE_INIT_DELAY)

        try {
          await this.sendChatPrompt(options)
        } catch (err) {
          // Retry once with longer delay
          console.log('Chat prompt failed, retrying...')
          await this.sleep(VSCODE_RETRY_DELAY - VSCODE_INIT_DELAY)
          await this.sendChatPrompt(options)
        }
      }

      return {
        success: true,
        vscodePid: pid,
        workspaceIdentifier: options.workingDirectory,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        workspaceIdentifier: options.workingDirectory,
      }
    }
  }

  /**
   * Send a chat prompt to VS Code's Claude Code extension
   */
  private async sendChatPrompt(options: VSCodeLaunchOptions): Promise<void> {
    if (!this.vscodePath || !options.initialPrompt) return

    const chatArgs = ['chat', options.initialPrompt]

    // Add mode
    chatArgs.push('--mode', options.chatMode || 'agent')

    // Add context files
    if (options.contextFiles?.length) {
      for (const file of options.contextFiles) {
        chatArgs.push('--add-file', file)
      }
    }

    // Maximize chat panel if requested
    if (options.maximizeChat) {
      chatArgs.push('--maximize')
    }

    // Reuse existing window (the one we just opened)
    chatArgs.push('--reuse-window')

    return new Promise((resolve, reject) => {
      const proc = spawn(this.vscodePath!, chatArgs, {
        cwd: options.workingDirectory,
        stdio: 'pipe',
        shell: true,
      })

      let stderr = ''
      proc.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      proc.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`code chat exited with code ${code}: ${stderr}`))
        }
      })

      proc.on('error', reject)
    })
  }

  /**
   * Launch VS Code for a specific journey (convenience wrapper)
   */
  async launchForJourney(request: JourneyLaunchRequest): Promise<VSCodeLaunchResult> {
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
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
