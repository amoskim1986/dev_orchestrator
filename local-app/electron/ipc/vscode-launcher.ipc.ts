/**
 * VS Code Launcher IPC Handlers
 */

import { ipcMain } from 'electron'
import {
  getVSCodeLauncherService,
  buildPromptForJourney,
  buildResumePrompt,
  buildCodeReviewPrompt,
  buildTestingPrompt,
} from '../services/vscode-launcher'
import type { VSCodeLaunchOptions, JourneyLaunchRequest } from '../services/vscode-launcher'

export function registerVSCodeLauncherIpc() {
  const service = getVSCodeLauncherService()

  // Check VS Code installation status
  ipcMain.handle('vscode:getStatus', async () => {
    return service.getStatus()
  })

  // Launch VS Code with options
  ipcMain.handle('vscode:launch', async (_event, options: VSCodeLaunchOptions) => {
    return service.launch(options)
  })

  // Launch VS Code for a specific journey
  ipcMain.handle('vscode:launchForJourney', async (_event, request: JourneyLaunchRequest) => {
    return service.launchForJourney(request)
  })

  // Generate prompt for journey (without launching)
  ipcMain.handle(
    'vscode:generatePrompt',
    async (
      _event,
      {
        type,
        context,
        lastActivity,
      }: {
        type: 'default' | 'resume' | 'review' | 'testing'
        context: JourneyLaunchRequest
        lastActivity?: string
      }
    ) => {
      switch (type) {
        case 'resume':
          return buildResumePrompt(context, lastActivity)
        case 'review':
          return buildCodeReviewPrompt(context)
        case 'testing':
          return buildTestingPrompt(context)
        default:
          return buildPromptForJourney(context)
      }
    }
  )
}
