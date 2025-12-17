import { useState, useCallback, useEffect } from 'react'
import {
  useTranscriptionSessions,
  type TranscriptionSession,
} from '../../hooks/useTranscriptionSessions'
import { TranscriptionList } from './TranscriptionList'
import { TranscriptionViewer } from './TranscriptionViewer'
import { NewRecordingPanel } from './NewRecordingPanel'

export function TranscriptionsTab() {
  const {
    sessions,
    loading,
    error,
    fetchSessions,
    getSession,
    updateSession,
    deleteSession,
  } = useTranscriptionSessions()

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [selectedSession, setSelectedSession] = useState<TranscriptionSession | null>(null)
  const [showNewRecording, setShowNewRecording] = useState(false)

  // Load full session when selection changes
  useEffect(() => {
    if (selectedSessionId) {
      getSession(selectedSessionId).then((session) => {
        setSelectedSession(session)
      })
    } else {
      setSelectedSession(null)
    }
  }, [selectedSessionId, getSession])

  const handleSelectSession = useCallback((id: string) => {
    setSelectedSessionId(id)
    setShowNewRecording(false)
  }, [])

  const handleRecordingComplete = useCallback(
    (session: TranscriptionSession) => {
      fetchSessions()
      setSelectedSessionId(session.id)
      setShowNewRecording(false)
    },
    [fetchSessions]
  )

  const handleUpdate = useCallback(
    async (
      id: string,
      updates: Partial<TranscriptionSession>
    ): Promise<TranscriptionSession | null> => {
      const updated = await updateSession(id, updates)
      if (updated && selectedSessionId === id) {
        setSelectedSession(updated)
      }
      return updated
    },
    [updateSession, selectedSessionId]
  )

  const handleDelete = useCallback(
    async (id: string): Promise<boolean> => {
      const success = await deleteSession(id)
      if (success && selectedSessionId === id) {
        setSelectedSessionId(null)
        setSelectedSession(null)
      }
      return success
    },
    [deleteSession, selectedSessionId]
  )

  const handleRefresh = useCallback(() => {
    fetchSessions()
    if (selectedSessionId) {
      getSession(selectedSessionId).then((session) => {
        setSelectedSession(session)
      })
    }
  }, [fetchSessions, selectedSessionId, getSession])

  return (
    <div className="h-full flex flex-col">
      {/* Error banner */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/50 border-b border-red-300 dark:border-red-700 px-4 py-2 text-sm text-red-700 dark:text-red-200">
          {error.message}
        </div>
      )}

      {/* New Recording Panel (collapsible) */}
      <NewRecordingPanel
        isExpanded={showNewRecording}
        onToggle={() => setShowNewRecording(!showNewRecording)}
        onComplete={handleRecordingComplete}
      />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Session list */}
        <div className="w-80 border-r border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Transcriptions{' '}
              {sessions.length > 0 && (
                <span className="text-gray-500">({sessions.length})</span>
              )}
            </h3>
            <button
              onClick={() => setShowNewRecording(true)}
              className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
            >
              + New
            </button>
          </div>
          <TranscriptionList
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            onSelectSession={handleSelectSession}
            isLoading={loading}
          />
        </div>

        {/* Detail viewer */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-gray-900">
          {selectedSession ? (
            <TranscriptionViewer
              session={selectedSession}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onRefresh={handleRefresh}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                <p>Select a transcription to view</p>
                <p className="text-sm mt-1">or click "+ New" to start recording</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
