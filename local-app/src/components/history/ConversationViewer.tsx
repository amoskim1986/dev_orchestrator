import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useState, useEffect, useCallback } from 'react'
import type { ClaudeMessage } from '../../types/history'

interface ConversationViewerProps {
  messages: ClaudeMessage[]
  isLoading: boolean
}

interface MessageBubbleProps {
  message: ClaudeMessage
  searchQuery: string
  isCurrentMatch: boolean
  matchRef?: React.RefObject<HTMLDivElement>
}

function highlightText(text: string, query: string, isCurrentMatch: boolean): React.ReactNode {
  if (!query) return text

  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))

  return parts.map((part, i) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      return (
        <mark
          key={i}
          className={`${isCurrentMatch ? 'bg-orange-400' : 'bg-yellow-300'} text-gray-900 rounded px-0.5`}
        >
          {part}
        </mark>
      )
    }
    return part
  })
}

// Collapsible section for tool content
function CollapsibleContent({
  label,
  content,
  defaultOpen = false,
  maxPreviewLines = 3,
  isError = false
}: {
  label: string
  content: string
  defaultOpen?: boolean
  maxPreviewLines?: number
  isError?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const lines = content.split('\n')
  const shouldTruncate = lines.length > maxPreviewLines
  const preview = shouldTruncate ? lines.slice(0, maxPreviewLines).join('\n') + '...' : content

  return (
    <div className={`mt-1 rounded border ${isError ? 'border-red-700 bg-red-900/20' : 'border-gray-600 bg-gray-800/50'}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2 py-1 text-xs text-gray-400 hover:text-gray-300"
      >
        <span>{label}</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`px-2 pb-2 text-xs font-mono ${isError ? 'text-red-300' : 'text-gray-400'} whitespace-pre-wrap break-all overflow-hidden`}>
        {isOpen ? content : preview}
        {!isOpen && shouldTruncate && (
          <span className="text-gray-500 ml-1">({lines.length} lines)</span>
        )}
      </div>
    </div>
  )
}

// Format tool input for display
function formatToolInput(input?: Record<string, unknown>): string {
  if (!input) return ''
  try {
    return JSON.stringify(input, null, 2)
  } catch {
    return String(input)
  }
}

function MessageBubble({ message, searchQuery, isCurrentMatch, matchRef }: MessageBubbleProps) {
  const isUser = message.type === 'user'
  const isToolResult = message.type === 'tool_result'

  // Extract text content from message
  const textContent = message.content
    .filter((c) => c.type === 'text')
    .map((c) => (c as { type: 'text'; text: string }).text)
    .join('\n')

  // Extract tool uses
  const toolUses = message.content.filter((c) => c.type === 'tool_use') as Array<{
    type: 'tool_use'
    id: string
    name: string
    input?: Record<string, unknown>
  }>

  // Extract tool results
  const toolResults = message.content.filter((c) => c.type === 'tool_result') as Array<{
    type: 'tool_result'
    tool_use_id: string
    content: string
    is_error?: boolean
  }>

  const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  // Tool result messages get a different style
  if (isToolResult && toolResults.length > 0) {
    return (
      <div ref={matchRef} className={`p-2 bg-gray-850 border-l-2 border-gray-600 ${isCurrentMatch ? 'ring-2 ring-orange-400' : ''}`}>
        <div className="max-w-4xl mx-auto pl-11">
          {toolResults.map((result, idx) => (
            <div key={idx}>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span>Tool Result</span>
                {message.toolUseResult?.durationMs && (
                  <span className="text-gray-600">({message.toolUseResult.durationMs}ms)</span>
                )}
                {result.is_error && (
                  <span className="text-red-400">Error</span>
                )}
              </div>
              <CollapsibleContent
                label={result.is_error ? 'Error Output' : 'Output'}
                content={result.content || '(empty)'}
                isError={result.is_error}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div ref={matchRef} className={`p-4 ${isUser ? 'bg-gray-800/50' : 'bg-gray-900'} ${isCurrentMatch ? 'ring-2 ring-orange-400' : ''}`}>
      <div className="flex items-start gap-3 max-w-4xl mx-auto">
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            isUser ? 'bg-blue-600' : 'bg-purple-600'
          }`}
        >
          <span className="text-xs font-medium text-white">
            {isUser ? 'U' : 'C'}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-300">
              {isUser ? 'You' : 'Claude'}
            </span>
            {message.model && !isUser && (
              <span className="text-xs text-gray-500">
                ({message.model.split('-').slice(0, 2).join('-')})
              </span>
            )}
            <span className="text-xs text-gray-500">{time}</span>
          </div>

          {/* Text content */}
          {textContent && (
            <div className="text-sm text-gray-300 whitespace-pre-wrap break-words">
              {highlightText(textContent, searchQuery, isCurrentMatch)}
            </div>
          )}

          {/* Tool uses with expandable input */}
          {toolUses.length > 0 && (
            <div className="mt-2 space-y-2">
              {toolUses.map((tool) => (
                <div
                  key={tool.id}
                  className="bg-gray-800 rounded-md p-2 border border-gray-700"
                >
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span className="font-mono bg-gray-700 px-1.5 py-0.5 rounded">
                      {tool.name}
                    </span>
                  </div>
                  {tool.input && Object.keys(tool.input).length > 0 && (
                    <CollapsibleContent
                      label="Input"
                      content={formatToolInput(tool.input)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ConversationViewer({ messages, isLoading }: ConversationViewerProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const currentMatchRef = useRef<HTMLDivElement>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [matchingMessages, setMatchingMessages] = useState<number[]>([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)

  // Find messages that match the search query
  const findMatches = useCallback((query: string) => {
    if (!query.trim()) {
      setMatchingMessages([])
      setCurrentMatchIndex(0)
      return
    }

    const matches: number[] = []
    messages.forEach((message, index) => {
      const textContent = message.content
        .filter((c) => c.type === 'text')
        .map((c) => (c as { type: 'text'; text: string }).text)
        .join('\n')

      if (textContent.toLowerCase().includes(query.toLowerCase())) {
        matches.push(index)
      }
    })

    setMatchingMessages(matches)
    setCurrentMatchIndex(matches.length > 0 ? 0 : -1)
  }, [messages])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearch(true)
        setTimeout(() => searchInputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false)
        setSearchQuery('')
        setMatchingMessages([])
      }
      if (e.key === 'Enter' && showSearch && matchingMessages.length > 0) {
        e.preventDefault()
        if (e.shiftKey) {
          // Previous match
          setCurrentMatchIndex((prev) =>
            prev <= 0 ? matchingMessages.length - 1 : prev - 1
          )
        } else {
          // Next match
          setCurrentMatchIndex((prev) =>
            prev >= matchingMessages.length - 1 ? 0 : prev + 1
          )
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSearch, matchingMessages.length])

  // Update matches when query changes
  useEffect(() => {
    findMatches(searchQuery)
  }, [searchQuery, findMatches])

  // Scroll to current match
  useEffect(() => {
    if (matchingMessages.length > 0 && currentMatchIndex >= 0) {
      const messageIndex = matchingMessages[currentMatchIndex]
      virtualizer.scrollToIndex(messageIndex, { align: 'center' })
    }
  }, [currentMatchIndex, matchingMessages])

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  })

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 mb-4 animate-pulse">
            <div className="w-8 h-8 bg-gray-700 rounded-full" />
            <div className="flex-1">
              <div className="h-4 w-24 bg-gray-700 rounded mb-2" />
              <div className="h-16 w-full bg-gray-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        No messages in this session
      </div>
    )
  }

  const currentMatchMessageIndex = matchingMessages[currentMatchIndex]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-b border-gray-700">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search in conversation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500 text-gray-200 placeholder-gray-400"
          />
          <div className="flex items-center gap-1 text-xs text-gray-400">
            {matchingMessages.length > 0 ? (
              <span>
                {currentMatchIndex + 1} of {matchingMessages.length}
              </span>
            ) : searchQuery ? (
              <span>No results</span>
            ) : null}
          </div>
          <button
            onClick={() => setCurrentMatchIndex((prev) =>
              prev <= 0 ? matchingMessages.length - 1 : prev - 1
            )}
            disabled={matchingMessages.length === 0}
            className="p-1.5 text-gray-400 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous (Shift+Enter)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentMatchIndex((prev) =>
              prev >= matchingMessages.length - 1 ? 0 : prev + 1
            )}
            disabled={matchingMessages.length === 0}
            className="p-1.5 text-gray-400 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next (Enter)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={() => {
              setShowSearch(false)
              setSearchQuery('')
              setMatchingMessages([])
            }}
            className="p-1.5 text-gray-400 hover:text-gray-200"
            title="Close (Esc)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Messages */}
      <div ref={parentRef} className="flex-1 overflow-auto overscroll-contain">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const message = messages[virtualItem.index]
            const isCurrentMatch = virtualItem.index === currentMatchMessageIndex
            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <MessageBubble
                  message={message}
                  searchQuery={searchQuery}
                  isCurrentMatch={isCurrentMatch}
                  matchRef={isCurrentMatch ? currentMatchRef : undefined}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
