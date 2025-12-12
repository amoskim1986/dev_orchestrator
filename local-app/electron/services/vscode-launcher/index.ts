/**
 * VS Code Launcher Service - Public API
 */

export { VSCodeLauncherService, getVSCodeLauncherService } from './vscode-launcher.service'

export type {
  VSCodeLaunchOptions,
  VSCodeLaunchResult,
  VSCodeStatus,
  JourneyLaunchRequest,
} from './types'

export { VSCODE_PATHS, VSCODE_INIT_DELAY, VSCODE_RETRY_DELAY } from './types'

export {
  buildPromptForJourney,
  buildResumePrompt,
  buildCodeReviewPrompt,
  buildTestingPrompt,
} from './prompts'
