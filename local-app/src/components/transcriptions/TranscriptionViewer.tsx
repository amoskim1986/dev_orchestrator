import { useState, useCallback } from 'react'
import type { TranscriptionSession } from '../../hooks/useTranscriptionSessions'

interface TranscriptionViewerProps {
  session: TranscriptionSession
  onUpdate: (id: string, updates: Partial<TranscriptionSession>) => Promise<TranscriptionSession | null>
  onDelete: (id: string) => Promise<boolean>
  onRefresh: () => void
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) {
    return `${mins} min ${secs} sec`
  }
  return `${secs} sec`
}

export function TranscriptionViewer({
  session,
  onUpdate,
  onDelete,
  onRefresh,
}: TranscriptionViewerProps) {
  const [showFormatted, setShowFormatted] = useState(!!session.formatted_transcript)
  const [isFormatting, setIsFormatting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleFormat = useCallback(async () => {
    if (!session.raw_transcript) return

    setIsFormatting(true)

    const prompt = `Please reformat the following transcribed speech to be clear, well-punctuated, and properly formatted while preserving ALL the original meaning and information. Fix any speech-to-text errors, add proper punctuation and paragraph breaks where appropriate. Only return the reformatted text, nothing else:

${session.raw_transcript}`

    try {
      const result = await window.electronAPI.claude.query({ prompt })
      if (result.success && result.data) {
        await onUpdate(session.id, {
          formatted_transcript: result.data as string,
          status: 'complete',
        })
        onRefresh()
        setShowFormatted(true)
      }
    } catch (err) {
      console.error('Format failed:', err)
    } finally {
      setIsFormatting(false)
    }
  }, [session.id, session.raw_transcript, onUpdate, onRefresh])

  const handleCopy = useCallback(async () => {
    const text =
      showFormatted && session.formatted_transcript
        ? session.formatted_transcript
        : session.raw_transcript

    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [showFormatted, session.formatted_transcript, session.raw_transcript])

  const handleDelete = useCallback(async () => {
    if (!confirm('Are you sure you want to delete this transcription?')) return

    setIsDeleting(true)
    try {
      await onDelete(session.id)
    } finally {
      setIsDeleting(false)
    }
  }, [session.id, onDelete])

  const displayText =
    showFormatted && session.formatted_transcript
      ? session.formatted_transcript
      : session.raw_transcript

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 truncate">
            {session.title || 'Untitled Transcription'}
          </h2>
          <div className="flex gap-2 flex-shrink-0">
            {session.formatted_transcript && (
              <button
                onClick={() => setShowFormatted(!showFormatted)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  showFormatted
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {showFormatted ? 'Formatted' : 'Raw'}
              </button>
            )}
            <button
              onClick={handleFormat}
              disabled={isFormatting || !session.raw_transcript}
              className="px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFormatting ? 'Formatting...' : 'Reformat with AI'}
            </button>
            <button
              onClick={handleCopy}
              disabled={!displayText}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-500 text-white rounded transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{formatDate(session.created_at)}</span>
          <span>•</span>
          <span>{formatDuration(session.duration_seconds)}</span>
          {session.status === 'recording' && (
            <>
              <span>•</span>
              <span className="text-red-500 animate-pulse">Recording in progress</span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          {displayText ? (
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {displayText}
            </p>
          ) : (
            <p className="text-gray-500 italic">No transcript content</p>
          )}
        </div>
      </div>
    </div>
  )
}
