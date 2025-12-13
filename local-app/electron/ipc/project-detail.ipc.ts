import { ipcMain } from 'electron'
import { projectDetailWindowManager } from '../services/project-detail-window'

export function registerProjectDetailIpc(): void {
  // Open project detail window
  ipcMain.handle('projectDetail:open', async (_event, projectId: string) => {
    return projectDetailWindowManager.open(projectId)
  })
}
