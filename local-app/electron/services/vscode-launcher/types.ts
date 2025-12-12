/**
 * VS Code Launcher Service - Type Definitions
 */

import type { JourneyType, JourneyStage } from '@dev-orchestrator/shared'

export interface VSCodeLaunchOptions {
  /** Working directory - typically the worktree path */
  workingDirectory: string
  /** Optional prompt to send to Claude after opening */
  initialPrompt?: string
  /** Chat mode: 'agent', 'ask', or 'edit' */
  chatMode?: 'agent' | 'ask' | 'edit'
  /** Files to add as context */
  contextFiles?: string[]
  /** Whether to maximize the chat panel */
  maximizeChat?: boolean
  /** Open in new window (recommended for journeys) */
  newWindow?: boolean
}

export interface VSCodeLaunchResult {
  success: boolean
  vscodePid?: number
  error?: string
  /** Identifier for the VS Code window (workspace path) */
  workspaceIdentifier: string
}

export interface VSCodeStatus {
  installed: boolean
  executablePath: string | null
  version: string | null
}

export interface JourneyLaunchRequest {
  journeyId: string
  journeyName: string
  journeyType: JourneyType
  journeyStage: JourneyStage
  worktreePath: string
  projectRootPath: string
  customPrompt?: string
}

// VS Code paths by platform
export const VSCODE_PATHS: Record<string, string> = {
  darwin: '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
  win32: 'code', // Assumes VS Code is in PATH on Windows
  linux: '/usr/bin/code',
}

// Default delay before sending chat prompt (ms)
export const VSCODE_INIT_DELAY = 2000

// Retry delay if first attempt fails (ms)
export const VSCODE_RETRY_DELAY = 3000
