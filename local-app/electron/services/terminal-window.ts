import { BrowserWindow } from 'electron'
import * as path from 'path'
import { ptyManager } from './pty-manager'

// Helper to generate UUID without external dependency
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

interface TerminalWindowOptions {
  cwd: string
  title?: string
  launchClaude?: boolean
  sessionId?: string
  initialPrompt?: string
}

class TerminalWindowManager {
  private windows: Map<string, BrowserWindow> = new Map()

  async create(options: TerminalWindowOptions): Promise<string> {
    const id = generateId()

    const window = new BrowserWindow({
      width: 900,
      height: 700,
      minWidth: 600,
      minHeight: 400,
      title: options.title || `Claude Terminal - ${path.basename(options.cwd)}`,
      backgroundColor: '#1a1a1a',
      titleBarStyle: 'hiddenInset',
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload-terminal.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    this.windows.set(id, window)

    // Load the terminal page - use VITE_DEV_SERVER_URL env var set by electron-vite
    const devServerUrl = process.env.VITE_DEV_SERVER_URL
    if (devServerUrl) {
      window.loadURL(`${devServerUrl}terminal.html`)
    } else {
      window.loadFile(path.join(__dirname, '../../dist/terminal.html'))
    }

    // Wait for the window to be ready
    await new Promise<void>((resolve) => {
      window.webContents.once('did-finish-load', () => {
        // Send the terminal ID to the renderer
        window.webContents.send('terminal:init', { id, cwd: options.cwd })
        resolve()
      })
    })

    // Spawn the PTY process
    ptyManager.spawn(id, options.cwd, window)

    // Launch Claude if requested
    if (options.launchClaude) {
      setTimeout(() => {
        ptyManager.launchClaude(id, options.sessionId, options.initialPrompt)
      }, 500)
    }

    // Handle window close
    window.on('closed', () => {
      ptyManager.kill(id)
      this.windows.delete(id)
    })

    return id
  }

  close(id: string): void {
    const window = this.windows.get(id)
    if (window && !window.isDestroyed()) {
      window.close()
    }
    this.windows.delete(id)
  }

  inject(id: string, text: string): void {
    ptyManager.write(id, text)
  }

  getWindow(id: string): BrowserWindow | undefined {
    return this.windows.get(id)
  }

  closeAll(): void {
    for (const [id, window] of this.windows) {
      if (!window.isDestroyed()) {
        window.close()
      }
      this.windows.delete(id)
    }
    ptyManager.killAll()
  }
}

export const terminalWindowManager = new TerminalWindowManager()
