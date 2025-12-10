import { ipcMain } from 'electron'
import { terminalWindowManager } from '../services/terminal-window'
import { ptyManager } from '../services/pty-manager'

export function registerTerminalIpc() {
  // Open a new terminal window
  ipcMain.handle('terminal:open', async (_event, options: {
    cwd: string
    title?: string
    launchClaude?: boolean
    sessionId?: string
    initialPrompt?: string
  }) => {
    return terminalWindowManager.create(options)
  })

  // Close a terminal window
  ipcMain.handle('terminal:close', async (_event, windowId: string) => {
    terminalWindowManager.close(windowId)
  })

  // Inject text into a terminal
  ipcMain.handle('terminal:inject', async (_event, windowId: string, text: string) => {
    terminalWindowManager.inject(windowId, text)
  })

  // PTY input from terminal renderer
  ipcMain.on('pty:input', (_event, id: string, data: string) => {
    ptyManager.write(id, data)
  })

  // PTY resize from terminal renderer
  ipcMain.on('pty:resize', (_event, id: string, cols: number, rows: number) => {
    ptyManager.resize(id, cols, rows)
  })
}
