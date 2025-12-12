// Claude Code history types

export interface ClaudeProject {
  id: string           // Encoded folder name: -Users-amoskim-Desktop-...
  path: string         // Decoded path: /Users/amoskim/Desktop/...
  name: string         // Folder name: dev_orchestrator
  sessionCount: number
  lastActive: Date
}

export interface ClaudeSession {
  id: string           // Filename without .jsonl
  projectId: string
  filePath: string     // Full path to .jsonl file
  messageCount: number
  timestamp: Date
  gitBranch: string
  firstMessage: string // Preview of first user message
}

export interface ClaudeMessage {
  uuid?: string
  type: 'user' | 'assistant' | 'tool_result'
  timestamp: Date
  content: MessageContent[]
  model?: string
  usage?: TokenUsage
  toolUseResult?: {
    durationMs?: number
    numFiles?: number
    truncated?: boolean
  }
}

export type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input?: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }

export interface TokenUsage {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
}

// Raw JSONL entry from Claude's history files
export interface RawClaudeEntry {
  type: 'user' | 'assistant' | 'summary' | 'queue-operation'
  message?: {
    role: string
    content: MessageContent[]
  }
  sessionId?: string
  timestamp?: string
  cwd?: string
  gitBranch?: string
  model?: string
  usage?: TokenUsage
  uuid?: string
}
