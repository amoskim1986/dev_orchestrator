import { ipcMain } from 'electron'
import { historyService } from '../services/history.service'

export function registerHistoryIpc() {
  ipcMain.handle('history:getProjects', async () => {
    return historyService.getProjects()
  })

  ipcMain.handle('history:getSessions', async (_event, projectId: string) => {
    return historyService.getSessions(projectId)
  })

  ipcMain.handle('history:getMessages', async (_event, filePath: string) => {
    return historyService.getSessionMessages(filePath)
  })
}
