import { useState, useCallback, useEffect, useRef } from 'react'

// Types matching the IPC handler
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

export type TranscriptionSessionInsert = Partial<
  Omit<TranscriptionSession, 'id' | 'created_at' | 'updated_at'>
>
export type TranscriptionSessionUpdate = Partial<
  Omit<TranscriptionSession, 'id' | 'created_at'>
>

export interface TranscriptionIndexEntry {
  id: string
  title: string | null
  status: TranscriptionSession['status']
  duration_seconds: number
  created_at: string
  preview: string
}

// Hook for listing and managing transcription sessions
export function useTranscriptionSessions() {
  const [sessions, setSessions] = useState<TranscriptionIndexEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await window.electronAPI.transcriptions.list()
      setSessions(list)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load sessions'))
    } finally {
      setLoading(false)
    }
  }, [])

  const getSession = useCallback(async (id: string): Promise<TranscriptionSession | null> => {
    return window.electronAPI.transcriptions.get(id)
  }, [])

  const createSession = useCallback(
    async (data: TranscriptionSessionInsert): Promise<TranscriptionSession> => {
      const session = await window.electronAPI.transcriptions.create(data)
      // Add to local state
      setSessions((prev) => [
        {
          id: session.id,
          title: session.title,
          status: session.status,
          duration_seconds: session.duration_seconds,
          created_at: session.created_at,
          preview: session.raw_transcript.slice(0, 100),
        },
        ...prev,
      ])
      return session
    },
    []
  )

  const updateSession = useCallback(
    async (
      id: string,
      updates: TranscriptionSessionUpdate
    ): Promise<TranscriptionSession | null> => {
      const session = await window.electronAPI.transcriptions.update(id, updates)
      if (session) {
        // Update local state
        setSessions((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  title: session.title,
                  status: session.status,
                  duration_seconds: session.duration_seconds,
                  preview: session.raw_transcript.slice(0, 100),
                }
              : s
          )
        )
      }
      return session
    },
    []
  )

  const deleteSession = useCallback(async (id: string): Promise<boolean> => {
    const success = await window.electronAPI.transcriptions.delete(id)
    if (success) {
      setSessions((prev) => prev.filter((s) => s.id !== id))
    }
    return success
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Recover crashed sessions on mount
  useEffect(() => {
    window.electronAPI.transcriptions.recoverCrashed().then((recovered) => {
      if (recovered.length > 0) {
        console.log('Recovered crashed sessions:', recovered)
        fetchSessions()
      }
    })
  }, [fetchSessions])

  return {
    sessions,
    loading,
    error,
    fetchSessions,
    getSession,
    createSession,
    updateSession,
    deleteSession,
  }
}

// Hook for managing an active recording session with auto-save
export function useActiveTranscription() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedTranscriptRef = useRef('')

  // Auto-save every 5 seconds
  useEffect(() => {
    if (!activeSessionId) return

    autoSaveTimerRef.current = setInterval(async () => {
      // Only save if transcript has changed
      if (transcript !== lastSavedTranscriptRef.current) {
        setIsSaving(true)
        try {
          await window.electronAPI.transcriptions.update(activeSessionId, {
            raw_transcript: transcript,
          })
          lastSavedTranscriptRef.current = transcript
        } catch (err) {
          console.error('Auto-save failed:', err)
        } finally {
          setIsSaving(false)
        }
      }
    }, 5000)

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
      }
    }
  }, [activeSessionId, transcript])

  const startRecording = useCallback(async (): Promise<string> => {
    const session = await window.electronAPI.transcriptions.create({
      status: 'recording',
      raw_transcript: '',
    })

    setActiveSessionId(session.id)
    setTranscript('')
    setStartTime(new Date())
    lastSavedTranscriptRef.current = ''

    return session.id
  }, [])

  const appendTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal && text.trim()) {
      setTranscript((prev) => (prev ? `${prev} ${text}` : text))
    }
  }, [])

  const stopRecording = useCallback(async (): Promise<TranscriptionSession | null> => {
    if (!activeSessionId || !startTime) return null

    // Clear auto-save timer
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }

    const durationSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000)

    // Auto-generate title from first ~50 chars
    const title = transcript
      ? transcript.slice(0, 50).split(' ').slice(0, 8).join(' ') +
        (transcript.length > 50 ? '...' : '')
      : 'Untitled Recording'

    const session = await window.electronAPI.transcriptions.update(activeSessionId, {
      raw_transcript: transcript,
      status: 'complete',
      duration_seconds: durationSeconds,
      ended_at: new Date().toISOString(),
      title,
    })

    setActiveSessionId(null)
    setTranscript('')
    setStartTime(null)

    return session
  }, [activeSessionId, startTime, transcript])

  const cancelRecording = useCallback(async () => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }

    // Delete the partial session
    if (activeSessionId) {
      await window.electronAPI.transcriptions.delete(activeSessionId)
    }

    setActiveSessionId(null)
    setTranscript('')
    setStartTime(null)
  }, [activeSessionId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
    }
  }, [])

  return {
    activeSessionId,
    transcript,
    startTime,
    isRecording: !!activeSessionId,
    isSaving,
    startRecording,
    appendTranscript,
    stopRecording,
    cancelRecording,
    setTranscript, // Allow manual editing
  }
}
