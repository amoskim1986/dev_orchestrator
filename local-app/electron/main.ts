import { app, BrowserWindow, Menu } from 'electron'
import path from 'path'
import { registerHistoryIpc } from './ipc/history.ipc'
import { registerDialogIpc } from './ipc/dialog.ipc'
import { registerClaudeCliIpc } from './ipc/claude-cli.ipc'
import { registerVSCodeLauncherIpc } from './ipc/vscode-launcher.ipc'
import { registerGitIpc } from './ipc/git.ipc'
import { registerProjectDetailIpc } from './ipc/project-detail.ipc'
import { registerJourneyDetailIpc } from './ipc/journey-detail.ipc'
import { registerTranscriptionsIpc } from './ipc/transcriptions.ipc'
import { registerOverlayIpc } from './ipc/overlay.ipc'
import { registerMarkdownViewerIpc } from './ipc/markdown-viewer.ipc'
import { journeyOverlayWindowManager } from './services/journey-overlay-window'

// Handle uncaught exceptions gracefully (e.g., EPIPE from child processes)
process.on('uncaughtException', (error) => {
  // EPIPE errors from child processes are non-fatal - just log them
  if ((error as NodeJS.ErrnoException).code === 'EPIPE') {
    console.warn('EPIPE error (non-fatal):', error.message)
    return
  }
  // Log other errors but don't crash
  console.error('Uncaught exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason)
})

// Set app name for macOS menu bar and dock
app.name = 'Dev Orchestrator'

// Ensure only one instance of the app runs at a time
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // Another instance is already running - quit this one
  app.quit()
}

let mainWindow: BrowserWindow | null = null

function createMenu() {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ]
    }] : []),
    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ]
    },
    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ]
    },
    // Window menu
    {
      label: 'Window',
      submenu: [
        {
          label: 'Keep on Top',
          type: 'checkbox',
          accelerator: isMac ? 'Cmd+Shift+T' : 'Ctrl+Shift+T',
          click: (menuItem, browserWindow) => {
            if (browserWindow) {
              browserWindow.setAlwaysOnTop(menuItem.checked)
            }
          }
        },
        { type: 'separator' },
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const },
        ] : [
          { role: 'close' as const },
        ]),
      ]
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function createWindow() {
  // Use VITE_DEV_SERVER_URL env var set by electron-vite
  // In development, electron-vite should set this, but as fallback use !app.isPackaged
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || (!app.isPackaged ? 'http://localhost:3010' : undefined)

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

// Focus existing window when second instance tries to launch
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.whenReady().then(async () => {
  // Set dock icon on macOS
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(path.join(__dirname, '../../resources/icon.png'))
  }

  // Create application menu
  createMenu()

  // Register IPC handlers
  registerHistoryIpc()
  registerDialogIpc()
  registerClaudeCliIpc()
  registerVSCodeLauncherIpc()
  registerGitIpc()
  registerProjectDetailIpc()
  registerJourneyDetailIpc()
  registerTranscriptionsIpc()
  registerOverlayIpc()
  registerMarkdownViewerIpc()

  // Dynamically import terminal IPC to avoid app.isPackaged at module load time
  const { registerTerminalIpc } = await import('./ipc/terminal.ipc')
  registerTerminalIpc()

  createWindow()

  // Start overlay polling immediately so it works for any VS Code window
  journeyOverlayWindowManager.startPolling()

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
  const { projectDetailWindowManager } = await import('./services/project-detail-window')
  const { journeyDetailWindowManager } = await import('./services/journey-detail-window')
  const { markdownViewerWindowManager } = await import('./services/markdown-viewer-window')
  terminalWindowManager.closeAll()
  projectDetailWindowManager.closeAll()
  journeyDetailWindowManager.closeAll()
  markdownViewerWindowManager.closeAll()
})
