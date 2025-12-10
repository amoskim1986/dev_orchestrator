import { useEffect, useState, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

const PROMPT_BUTTONS = [
  { label: 'Analyze Code', prompt: 'Analyze this codebase and explain the architecture' },
  { label: 'Write Tests', prompt: 'Write comprehensive tests for the current changes' },
  { label: 'Review Changes', prompt: 'Review my recent changes and suggest improvements' },
  { label: 'Fix Bug', prompt: 'Help me debug and fix the current issue' },
]

export function TerminalPage() {
  const terminalRef = useRef<HTMLDivElement>(null)
  const terminalInstance = useRef<Terminal | null>(null)
  const fitAddon = useRef<FitAddon | null>(null)
  const terminalIdRef = useRef<string | null>(null)
  const [terminalId, setTerminalId] = useState<string | null>(null)
  const [cwd, setCwd] = useState<string>('')

  useEffect(() => {
    // Initialize terminal
    const term = new Terminal({
      theme: {
        background: '#1a1a1a',
        foreground: '#e4e4e4',
        cursor: '#e4e4e4',
        cursorAccent: '#1a1a1a',
        selectionBackground: '#4a4a4a',
        black: '#1a1a1a',
        red: '#ff6b6b',
        green: '#69db7c',
        yellow: '#ffd43b',
        blue: '#74c0fc',
        magenta: '#da77f2',
        cyan: '#66d9e8',
        white: '#e4e4e4',
        brightBlack: '#4a4a4a',
        brightRed: '#ff8787',
        brightGreen: '#8ce99a',
        brightYellow: '#ffec99',
        brightBlue: '#a5d8ff',
        brightMagenta: '#e599f7',
        brightCyan: '#99e9f2',
        brightWhite: '#ffffff',
      },
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
      fontSize: 14,
      cursorBlink: true,
      cursorStyle: 'block',
      allowProposedApi: true,
    })

    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon())

    terminalInstance.current = term
    fitAddon.current = fit

    if (terminalRef.current) {
      term.open(terminalRef.current)
      fit.fit()
    }

    // Handle window resize
    const handleResize = () => {
      if (fitAddon.current && terminalId) {
        fitAddon.current.fit()
        const dims = fitAddon.current.proposeDimensions()
        if (dims) {
          window.terminalAPI.resize(terminalId, dims.cols, dims.rows)
        }
      }
    }
    window.addEventListener('resize', handleResize)

    // Listen for terminal initialization
    window.terminalAPI.onInit((data) => {
      terminalIdRef.current = data.id
      setTerminalId(data.id)
      setCwd(data.cwd)

      // Set up PTY data listener
      window.terminalAPI.onData((id, ptyData) => {
        if (id === data.id && terminalInstance.current) {
          terminalInstance.current.write(ptyData)
        }
      })

      // Set up exit listener
      window.terminalAPI.onExit((id, exitCode) => {
        if (id === data.id && terminalInstance.current) {
          terminalInstance.current.write(`\r\n[Process exited with code ${exitCode}]\r\n`)
        }
      })

      // Fit and send initial size
      setTimeout(() => {
        if (fitAddon.current) {
          fitAddon.current.fit()
          const dims = fitAddon.current.proposeDimensions()
          if (dims) {
            window.terminalAPI.resize(data.id, dims.cols, dims.rows)
          }
        }
      }, 100)
    })

    // Handle user input - use ref to always have current value
    term.onData((data) => {
      if (terminalIdRef.current) {
        window.terminalAPI.sendInput(terminalIdRef.current, data)
      }
    })

    return () => {
      window.removeEventListener('resize', handleResize)
      term.dispose()
    }
  }, [])

  // Update resize handler when terminalId changes
  useEffect(() => {
    if (terminalId && fitAddon.current) {
      fitAddon.current.fit()
      const dims = fitAddon.current.proposeDimensions()
      if (dims) {
        window.terminalAPI.resize(terminalId, dims.cols, dims.rows)
      }
    }
  }, [terminalId])

  const handlePromptClick = (prompt: string) => {
    if (terminalId) {
      window.terminalAPI.sendInput(terminalId, prompt + '\n')
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Title bar */}
      <div className="titlebar h-10 bg-gray-800 flex items-center px-4 shrink-0 border-b border-gray-700">
        <span className="text-sm text-gray-400 font-medium truncate">
          Claude Terminal {cwd && `- ${cwd.split('/').pop()}`}
        </span>
      </div>

      {/* Terminal area */}
      <div className="flex-1 p-2 overflow-hidden">
        <div ref={terminalRef} className="h-full w-full" />
      </div>

      {/* Prompt buttons */}
      <div className="shrink-0 bg-gray-800 border-t border-gray-700 p-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 mr-2">Quick Prompts:</span>
          {PROMPT_BUTTONS.map((btn) => (
            <button
              key={btn.label}
              onClick={() => handlePromptClick(btn.prompt)}
              className="px-3 py-1.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
