import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '../common/Button'
import type { Project, ProjectUpdate } from '../../types'

interface ProjectIntakeEditorProps {
  project: Project
  onUpdate: (updates: ProjectUpdate) => Promise<void>
}

type TabId = 'raw' | 'ai'

export function ProjectIntakeEditor({ project, onUpdate }: ProjectIntakeEditorProps) {
  const [activeTab, setActiveTab] = useState<TabId>('raw')
  const [rawContent, setRawContent] = useState(project.raw_intake || '')
  const [aiContent, setAiContent] = useState(project.ai_parsed_intake || '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Track if content is dirty (unsaved)
  const [rawDirty, setRawDirty] = useState(false)
  const [aiDirty, setAiDirty] = useState(false)

  // Debounce timer for AI content auto-save
  const aiSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Sync with project prop changes
  useEffect(() => {
    setRawContent(project.raw_intake || '')
    setAiContent(project.ai_parsed_intake || '')
    setRawDirty(false)
    setAiDirty(false)
  }, [project.raw_intake, project.ai_parsed_intake])

  // Handle raw content change
  const handleRawChange = useCallback((value: string) => {
    setRawContent(value)
    setRawDirty(value !== (project.raw_intake || ''))
  }, [project.raw_intake])

  // Handle AI content change (debounced auto-save)
  const handleAiChange = useCallback((value: string) => {
    setAiContent(value)
    setAiDirty(value !== (project.ai_parsed_intake || ''))

    // Clear existing timer
    if (aiSaveTimerRef.current) {
      clearTimeout(aiSaveTimerRef.current)
    }

    // Set new timer for auto-save
    aiSaveTimerRef.current = setTimeout(async () => {
      if (value !== project.ai_parsed_intake) {
        setIsSaving(true)
        try {
          await onUpdate({
            ai_parsed_intake: value,
            intake_updated_at: new Date().toISOString(),
          })
          setAiDirty(false)
        } catch (err) {
          setSaveError(err instanceof Error ? err.message : 'Failed to save')
        } finally {
          setIsSaving(false)
        }
      }
    }, 1000) // 1 second debounce
  }, [project.ai_parsed_intake, onUpdate])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (aiSaveTimerRef.current) {
        clearTimeout(aiSaveTimerRef.current)
      }
    }
  }, [])

  // Save raw content
  const handleSaveRaw = useCallback(async () => {
    if (!rawDirty) return

    setIsSaving(true)
    setSaveError(null)

    try {
      const previousRaw = project.raw_intake || ''
      await onUpdate({
        raw_intake: rawContent,
        raw_intake_previous: previousRaw,
        intake_updated_at: new Date().toISOString(),
      })
      setRawDirty(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [rawDirty, rawContent, project.raw_intake, onUpdate])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleString()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('raw')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'raw'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Raw Intake
          {rawDirty && <span className="ml-2 text-yellow-400">*</span>}
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'ai'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          AI Refined
          {project.ai_parsed_at && (
            <span className="ml-2 text-green-400 text-xs">
              (Generated)
            </span>
          )}
          {aiDirty && <span className="ml-2 text-yellow-400">*</span>}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4 space-y-3">
        {activeTab === 'raw' ? (
          <>
            <textarea
              value={rawContent}
              onChange={(e) => handleRawChange(e.target.value)}
              placeholder="Paste or type your raw project intake here..."
              className="flex-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {rawDirty ? 'Unsaved changes' : 'No unsaved changes'}
              </div>
              <Button
                onClick={handleSaveRaw}
                disabled={!rawDirty || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              {project.ai_parsed_at ? (
                <span>Generated on {formatDate(project.ai_parsed_at)}</span>
              ) : (
                <span>No AI-refined version yet</span>
              )}
              <span className="text-gray-500">
                (AI generation available in desktop app)
              </span>
            </div>
            <textarea
              value={aiContent}
              onChange={(e) => handleAiChange(e.target.value)}
              placeholder="AI-refined content will appear here. Generate from the desktop app or manually edit."
              className="flex-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
            />
            <div className="flex items-center justify-end text-xs text-gray-500">
              {isSaving ? 'Saving...' : aiDirty ? 'Saving in 1s...' : 'Auto-saved'}
            </div>
          </>
        )}

        {/* Error display */}
        {saveError && (
          <p className="text-sm text-red-400">{saveError}</p>
        )}
      </div>
    </div>
  )
}
