/**
 * Journey Overlay IPC Handlers
 */

import { ipcMain } from 'electron'
import { journeyOverlayWindowManager, JourneyOverlayData } from '../services/journey-overlay-window'
import { journeyDetailWindowManager } from '../services/journey-detail-window'

export function registerOverlayIpc() {
  // Show overlay for a journey and register it for tracking
  ipcMain.handle('overlay:show', async (_event, data: JourneyOverlayData & { workspacePath?: string }) => {
    // Register the journey for VS Code focus tracking
    if (data.workspacePath) {
      journeyOverlayWindowManager.registerJourney(data as JourneyOverlayData & { workspacePath: string })
    }
    await journeyOverlayWindowManager.show(data)
    return { success: true }
  })

  // Hide overlay
  ipcMain.handle('overlay:hide', async () => {
    journeyOverlayWindowManager.hide()
    return { success: true }
  })

  // Close overlay and stop tracking
  ipcMain.handle('overlay:close', async () => {
    journeyOverlayWindowManager.close()
    return { success: true }
  })

  // Open journey detail from overlay
  ipcMain.handle('overlay:openJourneyDetail', async (_event, journeyId: string, projectId: string) => {
    await journeyDetailWindowManager.open(journeyId, projectId)
    return { success: true }
  })
}
