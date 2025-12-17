import { useEffect, useRef, useCallback, useState } from 'react'
import { useSpeechToText } from '../../hooks/useSpeechToText'
import { useActiveTranscription, type TranscriptionSession } from '../../hooks/useTranscriptionSessions'

interface NewRecordingPanelProps {
  isExpanded: boolean
  onToggle: () => void
  onComplete: (session: TranscriptionSession) => void
}

export function NewRecordingPanel({
  isExpanded,
  onToggle,
  onComplete,
}: NewRecordingPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isReformatting, setIsReformatting] = useState(false)

  const {
    activeSessionId,
    transcript,
    isRecording: isSessionActive,
    isSaving,
    startRecording: startSession,
    appendTranscript,
    stopRecording: stopSession,
    cancelRecording,
    setTranscript,
  } = useActiveTranscription()

  const {
    isRecording: isDeepgramRecording,
    isConnecting,
    interimTranscript,
    error,
    startRecording: startDeepgram,
    stopRecording: stopDeepgram,
  } = useSpeechToText({
    onTranscript: useCallback(
      (text: string, isFinal: boolean) => {
        appendTranscript(text, isFinal)
      },
      [appendTranscript]
    ),
  })

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height =
        Math.min(Math.max(textareaRef.current.scrollHeight, 100), 400) + 'px'
    }
  }, [transcript, interimTranscript])

  const handleStartRecording = useCallback(async () => {
    await startSession()
    await startDeepgram()
  }, [startSession, startDeepgram])

  const handleStopRecording = useCallback(async () => {
    stopDeepgram()
    const session = await stopSession()
    if (session) {
      onComplete(session)
    }
  }, [stopDeepgram, stopSession, onComplete])

  const handleToggleRecording = useCallback(async () => {
    if (isDeepgramRecording || isConnecting) {
      await handleStopRecording()
    } else {
      await handleStartRecording()
    }
  }, [isDeepgramRecording, isConnecting, handleStartRecording, handleStopRecording])

  const handleCancel = useCallback(async () => {
    stopDeepgram()
    await cancelRecording()
    onToggle()
  }, [stopDeepgram, cancelRecording, onToggle])

  const handleReformat = useCallback(async () => {
    if (!transcript) return

    setIsReformatting(true)
    const prompt = `Please reformat the following transcribed speech to be clear, well-punctuated, and properly formatted while preserving ALL the original meaning and information. Fix any speech-to-text errors, add proper punctuation and paragraph breaks where appropriate. Only return the reformatted text, nothing else:

${transcript}`

    try {
      const result = await window.electronAPI.claude.query({ prompt })
      if (result.success && result.data) {
        setTranscript(result.data as string)
      }
    } catch (err) {
      console.error('Reformat failed:', err)
    } finally {
      setIsReformatting(false)
    }
  }, [transcript, setTranscript])

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setTranscript(e.target.value)
    },
    [setTranscript]
  )

  // Don't render if collapsed and no active session
  if (!isExpanded && !isSessionActive) {
    return null
  }

  const displayText = transcript + (interimTranscript ? (transcript ? ' ' : '') + interimTranscript : '')

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isSessionActive ? 'Recording...' : 'New Recording'}
          {isSaving && (
            <span className="ml-2 text-xs text-green-600 dark:text-green-400">
              (auto-saving...)
            </span>
          )}
        </h3>
        <button
          onClick={isSessionActive ? handleCancel : onToggle}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1"
          title={isSessionActive ? 'Cancel recording' : 'Close'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {/* Error message */}
        {error && (
          <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200 text-sm rounded">
            {error}
          </div>
        )}

        {/* Transcript textarea - editable */}
        <textarea
          ref={textareaRef}
          value={displayText}
          onChange={handleTextChange}
          placeholder="Click the microphone to start recording, or type/paste text here..."
          className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 text-sm resize-none min-h-[100px] max-h-[400px] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        />

        {/* Interim transcript indicator */}
        {interimTranscript && (
          <div className="mt-2 text-xs text-gray-500 italic">
            Listening: <span className="text-blue-500">{interimTranscript}</span>
          </div>
        )}

        {/* Controls */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Record button */}
            <button
              onClick={handleToggleRecording}
              disabled={isConnecting}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
                isDeepgramRecording
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                  : isConnecting
                    ? 'bg-yellow-600 cursor-wait'
                    : 'bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500'
              }`}
              title={isDeepgramRecording ? 'Stop recording' : 'Start recording'}
            >
              {isConnecting ? (
                <svg
                  className="w-6 h-6 text-white animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : isDeepgramRecording ? (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              )}
            </button>

            {/* Reformat button */}
            <button
              onClick={handleReformat}
              disabled={!transcript || isReformatting || isDeepgramRecording}
              className="px-3 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isReformatting ? 'Reformatting...' : 'Reformat'}
            </button>

            {isSessionActive && (
              <span className="text-sm text-gray-500">
                Auto-saving every 5 seconds
              </span>
            )}
          </div>

          {/* Save button */}
          <button
            onClick={handleStopRecording}
            disabled={!activeSessionId || !transcript}
            className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Transcription
          </button>
        </div>
      </div>
    </div>
  )
}
