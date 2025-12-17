import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '../common/Button'
import { useJourneyIdeaParser } from '../../hooks/useClaudeCli'
import type { JourneyType } from '@dev-orchestrator/shared'

interface ParsedResult {
  name: string
  description: string
  early_plan: string
  type: JourneyType
}

interface PendingSubmission {
  id: string
  rawText: string
  status: 'parsing' | 'submitting' | 'error'
  error?: string
  parsedResult?: ParsedResult
}

interface JourneyIdeaInputProps {
  projectName: string
  onSubmit: (parsed: ParsedResult) => Promise<void>
  /** Optional: Force a specific journey type instead of AI detection */
  forceType?: JourneyType
  /** Optional: Placeholder text */
  placeholder?: string
  /** Optional: Show type selector for override */
  showTypeSelector?: boolean
}

const journeyTypeLabels: Record<JourneyType, string> = {
  feature_planning: 'Feature Planning',
  feature: 'Feature',
  bug: 'Bug Fix',
  investigation: 'Investigation',
}

export function JourneyIdeaInput({
  projectName,
  onSubmit,
  forceType,
  placeholder = 'Describe your feature, bug, or investigation idea...',
  showTypeSelector = false,
}: JourneyIdeaInputProps) {
  const [text, setText] = useState('')
  const [typeOverride, setTypeOverride] = useState<JourneyType | null>(null)
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { parse } = useJourneyIdeaParser()

  // Auto-expand textarea as content grows
  const autoExpand = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.max(textarea.scrollHeight, 80)}px`
    }
  }, [])

  // Re-expand when text changes (including from speech-to-text)
  useEffect(() => {
    autoExpand()
  }, [text, autoExpand])

  // Handle input changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
  }, [])

  // Handle native input event (for speech-to-text compatibility)
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const handleInput = () => {
      setText(textarea.value)
      autoExpand()
    }

    textarea.addEventListener('input', handleInput)
    return () => textarea.removeEventListener('input', handleInput)
  }, [autoExpand])

  // Process a submission (non-blocking)
  const processSubmission = useCallback(async (submissionId: string, rawText: string, typeOvr: JourneyType | null) => {
    try {
      // Parse with AI
      const result = await parse(rawText, projectName)
      if (!result) {
        setPendingSubmissions(prev => prev.map(s =>
          s.id === submissionId
            ? { ...s, status: 'error' as const, error: 'Failed to parse idea' }
            : s
        ))
        return
      }

      // Apply type override or forced type
      const finalType = forceType || typeOvr || result.type
      const parsedResult = { ...result, type: finalType }

      // Update status to submitting
      setPendingSubmissions(prev => prev.map(s =>
        s.id === submissionId
          ? { ...s, status: 'submitting' as const, parsedResult }
          : s
      ))

      // Submit to parent
      await onSubmit(parsedResult)

      // Remove from pending on success
      setPendingSubmissions(prev => prev.filter(s => s.id !== submissionId))
    } catch (err) {
      setPendingSubmissions(prev => prev.map(s =>
        s.id === submissionId
          ? { ...s, status: 'error' as const, error: err instanceof Error ? err.message : 'Submission failed' }
          : s
      ))
    }
  }, [parse, projectName, forceType, onSubmit])

  const handleSubmit = useCallback(() => {
    if (!text.trim()) return

    const submissionId = `submission-${Date.now()}`
    const rawText = text.trim()
    const currentTypeOverride = typeOverride

    // Add to pending queue
    setPendingSubmissions(prev => [...prev, {
      id: submissionId,
      rawText,
      status: 'parsing',
    }])

    // Clear input immediately so user can type next idea
    setText('')
    setTypeOverride(null)

    // Process in background (non-blocking)
    processSubmission(submissionId, rawText, currentTypeOverride)
  }, [text, typeOverride, processSubmission])

  // Retry a failed submission
  const handleRetry = useCallback((submission: PendingSubmission) => {
    setPendingSubmissions(prev => prev.map(s =>
      s.id === submission.id
        ? { ...s, status: 'parsing' as const, error: undefined }
        : s
    ))
    processSubmission(submission.id, submission.rawText, null)
  }, [processSubmission])

  // Remove a pending submission
  const handleDismiss = useCallback((submissionId: string) => {
    setPendingSubmissions(prev => prev.filter(s => s.id !== submissionId))
  }, [])

  // Copy text to clipboard
  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
  }, [])

  return (
    <div className="space-y-3">
      {/* Input Area */}
      <div className="space-y-2">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-colors"
            style={{ minHeight: '80px' }}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {showTypeSelector && !forceType && (
              <select
                value={typeOverride || ''}
                onChange={(e) => setTypeOverride(e.target.value as JourneyType || null)}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Auto-detect type</option>
                {Object.entries(journeyTypeLabels).map(([type, label]) => (
                  <option key={type} value={type}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!text.trim()}
            size="sm"
          >
            Create with AI
          </Button>
        </div>
      </div>

      {/* Pending Submissions Queue */}
      {pendingSubmissions.length > 0 && (
        <div className="space-y-2">
          {pendingSubmissions.map((submission) => (
            <PendingSubmissionCard
              key={submission.id}
              submission={submission}
              onRetry={() => handleRetry(submission)}
              onDismiss={() => handleDismiss(submission.id)}
              onCopy={() => handleCopy(submission.rawText)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Card for pending/processing/failed submissions
function PendingSubmissionCard({
  submission,
  onRetry,
  onDismiss,
  onCopy,
}: {
  submission: PendingSubmission
  onRetry: () => void
  onDismiss: () => void
  onCopy: () => void
}) {
  const statusStyles = {
    parsing: 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20',
    submitting: 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20',
    error: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20',
  }

  const statusText = {
    parsing: 'Parsing with AI...',
    submitting: 'Creating journey...',
    error: submission.error || 'Failed',
  }

  return (
    <div className={`rounded-lg border p-3 ${statusStyles[submission.status]}`}>
      <div className="flex items-start gap-3">
        {/* Status Indicator */}
        <div className="flex-shrink-0 mt-0.5">
          {submission.status === 'parsing' && (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
          {submission.status === 'submitting' && (
            <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          )}
          {submission.status === 'error' && (
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {statusText[submission.status]}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
            {submission.rawText}
          </p>
          {submission.parsedResult && submission.status === 'submitting' && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              → {submission.parsedResult.name}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1">
          <button
            onClick={onCopy}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            title="Copy text"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          {submission.status === 'error' && (
            <button
              onClick={onRetry}
              className="p-1 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 rounded"
              title="Retry"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          <button
            onClick={onDismiss}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            title="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
