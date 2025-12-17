import { ipcMain } from 'electron'
import { markdownViewerWindowManager, MarkdownViewerData } from '../services/markdown-viewer-window'

export function registerMarkdownViewerIpc(): void {
  // Open markdown viewer window
  ipcMain.handle('markdownViewer:open', async (_event, key: string, data: MarkdownViewerData) => {
    await markdownViewerWindowManager.open(key, data)
  })

  // Update markdown viewer content
  ipcMain.handle('markdownViewer:update', async (_event, key: string, data: MarkdownViewerData) => {
    markdownViewerWindowManager.update(key, data)
  })

  // Close markdown viewer window
  ipcMain.handle('markdownViewer:close', async (_event, key: string) => {
    markdownViewerWindowManager.close(key)
  })
}
