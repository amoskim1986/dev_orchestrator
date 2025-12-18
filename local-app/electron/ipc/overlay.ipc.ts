/**
 * Journey Overlay IPC Handlers
 */

import { ipcMain } from 'electron'
import { journeyOverlayWindowManager, JourneyOverlayData, ProjectOverlayData } from '../services/journey-overlay-window'
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

  // Open project detail from overlay
  ipcMain.handle('overlay:openProjectDetail', async (_event, projectId: string) => {
    const { projectDetailWindowManager } = await import('../services/project-detail-window')
    await projectDetailWindowManager.open(projectId)
    return { success: true }
  })

  // Register multiple journeys at once for VS Code focus tracking
  ipcMain.handle('overlay:registerBatch', async (_event, journeys: (JourneyOverlayData & { workspacePath?: string })[]) => {
    let count = 0
    let firstJourney: (JourneyOverlayData & { workspacePath?: string }) | null = null
    for (const j of journeys) {
      if (j.workspacePath) {
        journeyOverlayWindowManager.registerJourney(j as JourneyOverlayData & { workspacePath: string })
        if (!firstJourney) firstJourney = j
        count++
      }
    }
    // Start polling and show overlay immediately if we registered any journeys
    if (count > 0) {
      journeyOverlayWindowManager.startPolling()
      // Show overlay immediately with first registered journey
      if (firstJourney) {
        // console.log('[Overlay] Showing overlay immediately with first journey:', firstJourney.journeyName)
        await journeyOverlayWindowManager.show(firstJourney)
      }
    }
    return { success: true, count }
  })

  // Register multiple projects at once for VS Code focus tracking (for main branch / non-journey workspaces)
  ipcMain.handle('overlay:registerProjects', async (_event, projects: ProjectOverlayData[]) => {
    let count = 0
    for (const p of projects) {
      if (p.rootPath) {
        journeyOverlayWindowManager.registerProject(p)
        count++
      }
    }
    // Start polling if we registered any projects
    if (count > 0) {
      journeyOverlayWindowManager.startPolling()
    }
    return { success: true, count }
  })
}
