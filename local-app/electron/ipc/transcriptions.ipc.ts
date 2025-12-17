import { ipcMain, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

// Types
export interface TranscriptionSession {
  id: string
  title: string | null
  raw_transcript: string
  formatted_transcript: string | null
  status: 'recording' | 'complete' | 'formatting'
  duration_seconds: number
  started_at: string
  ended_at: string | null
  created_at: string
  updated_at: string
}

export type TranscriptionSessionInsert = Partial<Omit<TranscriptionSession, 'id' | 'created_at' | 'updated_at'>>
export type TranscriptionSessionUpdate = Partial<Omit<TranscriptionSession, 'id' | 'created_at'>>

// Index file contains metadata for all sessions
interface TranscriptionIndex {
  sessions: {
    id: string
    title: string | null
    status: TranscriptionSession['status']
    duration_seconds: number
    created_at: string
    preview: string
  }[]
}

function getStoragePath(): string {
  const documentsPath = app.getPath('documents')
  return path.join(documentsPath, 'DevOrchestrator', 'transcriptions')
}

function getSessionsPath(): string {
  return path.join(getStoragePath(), 'sessions')
}

function getIndexPath(): string {
  return path.join(getStoragePath(), 'index.json')
}

function ensureStorageExists(): void {
  const storagePath = getStoragePath()
  const sessionsPath = getSessionsPath()

  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true })
  }
  if (!fs.existsSync(sessionsPath)) {
    fs.mkdirSync(sessionsPath, { recursive: true })
  }

  const indexPath = getIndexPath()
  if (!fs.existsSync(indexPath)) {
    fs.writeFileSync(indexPath, JSON.stringify({ sessions: [] }, null, 2))
  }
}

function readIndex(): TranscriptionIndex {
  ensureStorageExists()
  const indexPath = getIndexPath()
  const data = fs.readFileSync(indexPath, 'utf-8')
  return JSON.parse(data)
}

function writeIndex(index: TranscriptionIndex): void {
  const indexPath = getIndexPath()
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2))
}

function generateId(): string {
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}_${random}`
}

function getSessionFilePath(id: string): string {
  return path.join(getSessionsPath(), `${id}.json`)
}

function readSession(id: string): TranscriptionSession | null {
  const filePath = getSessionFilePath(id)
  if (!fs.existsSync(filePath)) {
    return null
  }
  const data = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(data)
}

function writeSession(session: TranscriptionSession): void {
  const filePath = getSessionFilePath(session.id)
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2))
}

function deleteSessionFile(id: string): void {
  const filePath = getSessionFilePath(id)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}

export function registerTranscriptionsIpc() {
  ipcMain.handle('transcriptions:getStoragePath', () => {
    return getStoragePath()
  })

  ipcMain.handle('transcriptions:list', () => {
    const index = readIndex()
    return index.sessions
  })

  ipcMain.handle('transcriptions:get', (_event, id: string) => {
    return readSession(id)
  })

  ipcMain.handle(
    'transcriptions:create',
    (_event, data: TranscriptionSessionInsert): TranscriptionSession => {
      ensureStorageExists()

      const now = new Date().toISOString()
      const session: TranscriptionSession = {
        id: generateId(),
        title: data.title ?? null,
        raw_transcript: data.raw_transcript ?? '',
        formatted_transcript: data.formatted_transcript ?? null,
        status: data.status ?? 'recording',
        duration_seconds: data.duration_seconds ?? 0,
        started_at: data.started_at ?? now,
        ended_at: data.ended_at ?? null,
        created_at: now,
        updated_at: now,
      }

      writeSession(session)

      const index = readIndex()
      index.sessions.unshift({
        id: session.id,
        title: session.title,
        status: session.status,
        duration_seconds: session.duration_seconds,
        created_at: session.created_at,
        preview: session.raw_transcript.slice(0, 100),
      })
      writeIndex(index)

      return session
    }
  )

  ipcMain.handle(
    'transcriptions:update',
    (_event, id: string, updates: TranscriptionSessionUpdate): TranscriptionSession | null => {
      const session = readSession(id)
      if (!session) {
        return null
      }

      const updated: TranscriptionSession = {
        ...session,
        ...updates,
        updated_at: new Date().toISOString(),
      }
      writeSession(updated)

      const index = readIndex()
      const indexEntry = index.sessions.find((s) => s.id === id)
      if (indexEntry) {
        indexEntry.title = updated.title
        indexEntry.status = updated.status
        indexEntry.duration_seconds = updated.duration_seconds
        indexEntry.preview = updated.raw_transcript.slice(0, 100)
        writeIndex(index)
      }

      return updated
    }
  )

  ipcMain.handle('transcriptions:delete', (_event, id: string): boolean => {
    deleteSessionFile(id)

    const index = readIndex()
    index.sessions = index.sessions.filter((s) => s.id !== id)
    writeIndex(index)

    return true
  })

  ipcMain.handle('transcriptions:recoverCrashed', () => {
    const index = readIndex()
    const recovered: string[] = []
    const oneHourAgo = Date.now() - 60 * 60 * 1000

    for (const entry of index.sessions) {
      if (entry.status === 'recording') {
        const createdAt = new Date(entry.created_at).getTime()
        if (createdAt < oneHourAgo) {
          const session = readSession(entry.id)
          if (session) {
            session.status = 'complete'
            session.ended_at = session.updated_at
            session.updated_at = new Date().toISOString()
            writeSession(session)

            entry.status = 'complete'
            recovered.push(entry.id)
          }
        }
      }
    }

    if (recovered.length > 0) {
      writeIndex(index)
    }

    return recovered
  })
}
