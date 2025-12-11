import { app, BrowserWindow } from 'electron'
import path from 'path'
import { registerHistoryIpc } from './ipc/history.ipc'
import { registerDialogIpc } from './ipc/dialog.ipc'
import { registerClaudeCliIpc } from './ipc/claude-cli.ipc'

// Set app name for macOS menu bar and dock
app.name = 'Dev Orchestrator'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  // Use VITE_DEV_SERVER_URL env var set by electron-vite
  const devServerUrl = process.env.VITE_DEV_SERVER_URL

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Dev Orchestrator',
    icon: path.join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a1a',
  })

  if (devServerUrl) {
    // In development, load from Vite dev server
    mainWindow.loadURL(devServerUrl)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  // Set dock icon on macOS
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(path.join(__dirname, '../../resources/icon.png'))
  }

  // Register IPC handlers
  registerHistoryIpc()
  registerDialogIpc()
  registerClaudeCliIpc()

  // Dynamically import terminal IPC to avoid app.isPackaged at module load time
  const { registerTerminalIpc } = await import('./ipc/terminal.ipc')
  registerTerminalIpc()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Cleanup on quit
app.on('before-quit', async () => {
  const { terminalWindowManager } = await import('./services/terminal-window')
  terminalWindowManager.closeAll()
})
