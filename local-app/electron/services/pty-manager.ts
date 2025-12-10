import * as pty from 'node-pty'
import { BrowserWindow } from 'electron'
import * as fs from 'fs'

interface PtyInstance {
  pty: pty.IPty
  windowId: number
}

class PtyManager {
  private terminals: Map<string, PtyInstance> = new Map()

  spawn(id: string, cwd: string, window: BrowserWindow): void {
    // Use explicit shell path for macOS
    const shell = process.platform === 'win32' ? 'powershell.exe' : '/bin/zsh'

    // Validate cwd exists, fallback to home directory
    let workingDir = cwd
    if (!fs.existsSync(cwd)) {
      console.warn(`PTY: cwd does not exist: ${cwd}, using home directory`)
      workingDir = process.env.HOME || '/tmp'
    }

    console.log(`PTY: Spawning shell=${shell} cwd=${workingDir}`)

    try {
      const ptyProcess = pty.spawn(shell, ['-l'], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: workingDir,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          HOME: process.env.HOME || '',
          PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
        } as { [key: string]: string },
      })

      this.terminals.set(id, { pty: ptyProcess, windowId: window.id })

      ptyProcess.onData((data) => {
        if (!window.isDestroyed()) {
          window.webContents.send('pty:data', id, data)
        }
      })

      ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`PTY: Process exited with code=${exitCode} signal=${signal}`)
        if (!window.isDestroyed()) {
          window.webContents.send('pty:exit', id, exitCode)
        }
        this.terminals.delete(id)
      })

      console.log(`PTY: Successfully spawned process pid=${ptyProcess.pid}`)
    } catch (err) {
      console.error('PTY: Failed to spawn process:', err)
      if (!window.isDestroyed()) {
        window.webContents.send('pty:exit', id, 1)
      }
    }
  }

  write(id: string, data: string): void {
    const instance = this.terminals.get(id)
    if (instance) {
      instance.pty.write(data)
    }
  }

  resize(id: string, cols: number, rows: number): void {
    const instance = this.terminals.get(id)
    if (instance) {
      instance.pty.resize(cols, rows)
    }
  }

  kill(id: string): void {
    const instance = this.terminals.get(id)
    if (instance) {
      instance.pty.kill()
      this.terminals.delete(id)
    }
  }

  killAll(): void {
    for (const [id] of this.terminals) {
      this.kill(id)
    }
  }

  // Launch Claude Code in the terminal
  launchClaude(id: string, sessionId?: string, initialPrompt?: string): void {
    const instance = this.terminals.get(id)
    if (instance) {
      // Start claude command, optionally resuming a session
      const claudeCmd = sessionId ? `claude --resume ${sessionId}\n` : 'claude\n'
      instance.pty.write(claudeCmd)

      // Auto-accept trust prompt after a short delay
      setTimeout(() => {
        instance.pty.write('1\n') // Select "Yes, proceed"
      }, 500)

      // If there's an initial prompt, send it after Claude starts
      if (initialPrompt) {
        setTimeout(() => {
          instance.pty.write(initialPrompt + '\n')
        }, 2000) // Wait longer for Claude to fully start
      }
    }
  }
}

export const ptyManager = new PtyManager()
