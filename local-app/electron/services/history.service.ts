import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as readline from 'readline'

export interface ClaudeProject {
  id: string
  path: string
  name: string
  sessionCount: number
  lastActive: Date
}

export interface ClaudeSession {
  id: string
  projectId: string
  filePath: string
  messageCount: number
  timestamp: Date
  gitBranch: string
  firstMessage: string
}

export interface ClaudeMessage {
  uuid?: string
  type: 'user' | 'assistant' | 'tool_result'
  timestamp: Date
  content: Array<{
    type: string
    text?: string
    name?: string
    id?: string
    input?: Record<string, unknown>
    tool_use_id?: string
    content?: string
    is_error?: boolean
  }>
  model?: string
  toolUseResult?: {
    durationMs?: number
    numFiles?: number
    truncated?: boolean
  }
}

interface RawEntry {
  type: string
  message?: {
    role: string
    content:
      | string
      | Array<{
          type: string
          text?: string
          thinking?: string
          name?: string
          id?: string
          input?: Record<string, unknown>
          tool_use_id?: string
          content?: string
          is_error?: boolean
        }>
    model?: string
  }
  timestamp?: string
  gitBranch?: string
  model?: string
  uuid?: string
  toolUseResult?: {
    durationMs?: number
    numFiles?: number
    truncated?: boolean
  }
}

class ClaudeHistoryService {
  private claudeDir: string

  constructor() {
    this.claudeDir = path.join(os.homedir(), '.claude')
  }

  private decodePath(encoded: string): string {
    // Claude encodes paths as: / → - and - → -- and _ → -
    // This makes decoding ambiguous, so we try multiple interpretations
    const placeholder = '\x00'
    const basicDecode =
      '/' +
      encoded
        .slice(1) // Remove leading -
        .replace(/--/g, placeholder) // Protect real hyphens
        .replace(/-/g, '/') // Convert path separators
        .replace(new RegExp(placeholder, 'g'), '-') // Restore hyphens

    // If the path exists, return it
    if (fs.existsSync(basicDecode)) {
      return basicDecode
    }

    // Try replacing last path component's slashes with underscores
    // e.g., /Users/.../dev/orchestrator → /Users/.../dev_orchestrator
    const parts = basicDecode.split('/')
    for (let i = parts.length - 1; i > 0; i--) {
      // Try joining last N components with underscore
      const prefix = parts.slice(0, i).join('/')
      const suffix = parts.slice(i).join('_')
      const candidate = prefix + '/' + suffix
      if (fs.existsSync(candidate)) {
        return candidate
      }
    }

    // Fall back to basic decode
    return basicDecode
  }

  async getProjects(): Promise<ClaudeProject[]> {
    const projectsDir = path.join(this.claudeDir, 'projects')

    if (!fs.existsSync(projectsDir)) {
      return []
    }

    const folders = fs.readdirSync(projectsDir).filter((f) => f.startsWith('-'))
    const projects: ClaudeProject[] = []

    for (const folder of folders) {
      const folderPath = path.join(projectsDir, folder)
      const stats = fs.statSync(folderPath)

      if (!stats.isDirectory()) continue

      const files = fs.readdirSync(folderPath).filter((f) => f.endsWith('.jsonl'))

      // Get most recent file modification time
      let lastActive = new Date(0)
      for (const file of files) {
        const fileStat = fs.statSync(path.join(folderPath, file))
        if (fileStat.mtime > lastActive) {
          lastActive = fileStat.mtime
        }
      }

      const decodedPath = this.decodePath(folder)
      projects.push({
        id: folder,
        path: decodedPath,
        name: path.basename(decodedPath),
        sessionCount: files.length,
        lastActive,
      })
    }

    // Sort by most recently active
    return projects.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime())
  }

  async getSessions(projectId: string): Promise<ClaudeSession[]> {
    const projectDir = path.join(this.claudeDir, 'projects', projectId)

    if (!fs.existsSync(projectDir)) {
      return []
    }

    const files = fs.readdirSync(projectDir).filter((f) => f.endsWith('.jsonl'))
    const sessions: ClaudeSession[] = []

    for (const file of files) {
      const filePath = path.join(projectDir, file)
      const session = await this.parseSessionMetadata(filePath, projectId)
      if (session) {
        sessions.push(session)
      }
    }

    // Sort by most recent
    return sessions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  private async parseSessionMetadata(filePath: string, projectId: string): Promise<ClaudeSession | null> {
    try {
      const fileStream = fs.createReadStream(filePath)
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      })

      let messageCount = 0
      let firstMessage = ''
      let timestamp = new Date(0)
      let gitBranch = ''

      for await (const line of rl) {
        if (!line.trim()) continue

        try {
          const entry: RawEntry = JSON.parse(line)

          if (entry.type === 'user' || entry.type === 'assistant') {
            messageCount++

            if (entry.timestamp) {
              const entryTime = new Date(entry.timestamp)
              if (entryTime > timestamp) {
                timestamp = entryTime
              }
            }

            if (entry.gitBranch && !gitBranch) {
              gitBranch = entry.gitBranch
            }

            // Get first user message as preview (strip IDE context tags)
            if (entry.type === 'user' && !firstMessage && entry.message?.content) {
              let rawText = ''
              if (typeof entry.message.content === 'string') {
                rawText = entry.message.content
              } else if (Array.isArray(entry.message.content)) {
                const textContent = entry.message.content.find((c) => c.type === 'text')
                if (textContent?.text) {
                  rawText = textContent.text
                }
              }

              if (rawText) {
                // Strip <ide_opened_file>...</ide_opened_file> tags and get actual message
                let cleanText = rawText.replace(/<ide_opened_file>[\s\S]*?<\/ide_opened_file>/g, '').trim()
                // Also strip other system tags
                cleanText = cleanText.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, '').trim()

                if (cleanText) {
                  firstMessage = cleanText.slice(0, 150)
                  if (cleanText.length > 150) {
                    firstMessage += '...'
                  }
                }
              }
            }
          }
        } catch {
          // Skip malformed lines
        }
      }

      // Skip sessions with no messages or only 1 message (usually just IDE context)
      if (messageCount < 2) return null

      // Skip sessions without a meaningful first message
      if (!firstMessage || firstMessage.length < 5) return null

      // Skip warmup sessions (start with "Warmup" and have 2 messages)
      if (firstMessage.toLowerCase().startsWith('warmup') && messageCount === 2) return null

      // Skip caveat sessions (start with "Caveat:" and have 3 messages)
      if (firstMessage.toLowerCase().startsWith('caveat:') && messageCount === 3) return null

      const id = path.basename(filePath, '.jsonl')

      return {
        id,
        projectId,
        filePath,
        messageCount,
        timestamp,
        gitBranch: gitBranch || 'unknown',
        firstMessage,
      }
    } catch {
      return null
    }
  }

  async getSessionMessages(filePath: string): Promise<ClaudeMessage[]> {
    if (!fs.existsSync(filePath)) {
      return []
    }

    const fileStream = fs.createReadStream(filePath)
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    })

    const messages: ClaudeMessage[] = []

    for await (const line of rl) {
      if (!line.trim()) continue

      try {
        const entry: RawEntry = JSON.parse(line)

        if ((entry.type === 'user' || entry.type === 'assistant') && entry.message) {
          // Normalize content to always be an array
          let normalizedContent: ClaudeMessage['content'] = []
          let isToolResult = false

          if (typeof entry.message.content === 'string') {
            // Simple string content - wrap in array
            normalizedContent = [{ type: 'text', text: entry.message.content }]
          } else if (Array.isArray(entry.message.content)) {
            // Array content - extract from various block types
            for (const block of entry.message.content) {
              if (block.type === 'text' && block.text) {
                // Regular text block
                normalizedContent.push({ type: 'text', text: block.text })
              } else if (block.type === 'tool_use') {
                // Tool use - include name, id, AND input
                normalizedContent.push({
                  type: 'tool_use',
                  name: block.name,
                  id: block.id,
                  input: block.input,
                })
              } else if (block.type === 'tool_result') {
                // Tool result - include the content
                isToolResult = true
                normalizedContent.push({
                  type: 'tool_result',
                  tool_use_id: block.tool_use_id,
                  content: block.content,
                  is_error: block.is_error,
                })
              }
              // Skip: thinking blocks, etc.
            }

            // Skip if no displayable content after filtering
            if (normalizedContent.length === 0) {
              continue
            }
          } else {
            continue // Skip if content is invalid
          }

          messages.push({
            uuid: entry.uuid,
            type: isToolResult ? 'tool_result' : (entry.type as 'user' | 'assistant'),
            timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
            content: normalizedContent,
            model: entry.message.model || entry.model,
            toolUseResult: entry.toolUseResult,
          })
        }
      } catch {
        // Skip malformed lines
      }
    }

    return messages
  }
}

export const historyService = new ClaudeHistoryService()
