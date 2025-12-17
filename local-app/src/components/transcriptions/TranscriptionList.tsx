import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import type { TranscriptionIndexEntry } from '../../hooks/useTranscriptionSessions'

interface TranscriptionListProps {
  sessions: TranscriptionIndexEntry[]
  selectedSessionId: string | null
  onSelectSession: (id: string) => void
  isLoading: boolean
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 7) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } else if (days > 0) {
    return `${days}d ago`
  } else if (hours > 0) {
    return `${hours}h ago`
  } else if (minutes > 0) {
    return `${minutes}m ago`
  } else {
    return 'Just now'
  }
}

export function TranscriptionList({
  sessions,
  selectedSessionId,
  onSelectSession,
  isLoading,
}: TranscriptionListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: sessions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    overscan: 5,
  })

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-3 mb-2 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse">
            <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm p-4 text-center">
        No transcriptions yet.
        <br />
        Click "+ New" to start recording.
      </div>
    )
  }

  return (
    <div ref={parentRef} className="flex-1 overflow-auto overscroll-contain">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const session = sessions[virtualItem.index]
          const isSelected = selectedSessionId === session.id

          return (
            <div
              key={session.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="p-2"
            >
              <button
                onClick={() => onSelectSession(session.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-blue-100 dark:bg-blue-600/30 border border-blue-300 dark:border-blue-500/50'
                    : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border border-gray-200 dark:border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {session.title || 'Untitled'}
                  </span>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatRelativeTime(session.created_at)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-1">
                  {session.preview || '(empty)'}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{formatDuration(session.duration_seconds)}</span>
                  {session.status === 'recording' && (
                    <>
                      <span>•</span>
                      <span className="text-red-500 animate-pulse">Recording...</span>
                    </>
                  )}
                  {session.status === 'formatting' && (
                    <>
                      <span>•</span>
                      <span className="text-purple-500">Formatting...</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
