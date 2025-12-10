import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import type { ClaudeProject, ClaudeSession } from '../../types/history'

interface SessionListProps {
  sessions: ClaudeSession[]
  selectedSession: ClaudeSession | null
  onSelectSession: (session: ClaudeSession) => void
  isLoading: boolean
  projects: ClaudeProject[]
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 7) {
    return new Date(date).toLocaleDateString('en-US', {
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

export function SessionList({
  sessions,
  selectedSession,
  onSelectSession,
  isLoading,
  projects,
}: SessionListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: sessions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  })

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-3 mb-2 bg-gray-800 rounded-lg animate-pulse">
            <div className="h-4 w-3/4 bg-gray-700 rounded mb-2" />
            <div className="h-3 w-full bg-gray-700 rounded mb-2" />
            <div className="h-3 w-1/2 bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        No sessions found
      </div>
    )
  }

  // Create a map of project IDs to names for quick lookup
  const projectNameMap = new Map(projects.map((p) => [p.id, p.name]))

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
          const isSelected = selectedSession?.id === session.id
          const projectName = projectNameMap.get(session.projectId) || 'Unknown'

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
                onClick={() => onSelectSession(session)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-blue-600/30 border border-blue-500/50'
                    : 'bg-gray-800 hover:bg-gray-750 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-200 truncate">
                    {projectName}
                  </span>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatRelativeTime(session.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2 mb-1">
                  {session.firstMessage}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{session.messageCount} msgs</span>
                  <span>•</span>
                  <span className="truncate">{session.gitBranch}</span>
                </div>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
