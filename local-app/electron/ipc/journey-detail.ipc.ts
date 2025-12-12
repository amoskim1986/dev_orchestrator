import { ipcMain } from 'electron'
import { journeyDetailWindowManager } from '../services/journey-detail-window'

export function registerJourneyDetailIpc(): void {
  // Open journey detail window (or add tab if already open)
  ipcMain.handle('journeyDetail:open', async (_event, journeyId: string, projectId: string) => {
    await journeyDetailWindowManager.open(journeyId, projectId)
  })

  // Close a specific tab
  ipcMain.handle('journeyDetail:closeTab', async (_event, journeyId: string) => {
    journeyDetailWindowManager.closeTab(journeyId)
  })
}
