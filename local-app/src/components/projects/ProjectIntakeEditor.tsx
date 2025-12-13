import { useState, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '../common/Button'
import { useProjectIntakeAI } from '../../hooks/useClaudeCli'
import type { Project, ProjectUpdate } from '@dev-orchestrator/shared'

interface ProjectIntakeEditorProps {
  project: Project
  onUpdate: (updates: ProjectUpdate) => Promise<void>
  onShowChangesDialog: (data: {
    changesSummary: string
    suggestedUpdates: string
    updatedDocument: string
    onConfirm: () => Promise<void>
    onKeepCurrent: () => Promise<void>
  }) => void
}

type TabId = 'raw' | 'ai'
type AiViewMode = 'view' | 'edit'

export function ProjectIntakeEditor({ project, onUpdate, onShowChangesDialog }: ProjectIntakeEditorProps) {
  const [activeTab, setActiveTab] = useState<TabId>('raw')
  const [aiViewMode, setAiViewMode] = useState<AiViewMode>('view')
  const [rawContent, setRawContent] = useState(project.raw_intake || '')
  const [aiContent, setAiContent] = useState(project.ai_parsed_intake || '')
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const { refine, analyzeChanges, isProcessing, error: aiError } = useProjectIntakeAI()

  // Sync with project prop changes
  useEffect(() => {
    setRawContent(project.raw_intake || '')
    setAiContent(project.ai_parsed_intake || '')
    setIsDirty(false)
  }, [project.raw_intake, project.ai_parsed_intake])

  // Handle raw content change
  const handleRawChange = useCallback((value: string) => {
    setRawContent(value)
    setIsDirty(value !== (project.raw_intake || ''))
  }, [project.raw_intake])

  // Handle AI content change (debounced save)
  const handleAiChange = useCallback((value: string) => {
    setAiContent(value)
    // AI content saves are immediate (debounced in the future if needed)
  }, [])

  // Save AI content manually
  const handleSaveAiContent = useCallback(async () => {
    setIsSaving(true)
    setSaveError(null)
    try {
      await onUpdate({
        ai_parsed_intake: aiContent,
        intake_updated_at: new Date().toISOString(),
      })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [aiContent, onUpdate])

  // Save raw content
  const handleSaveRaw = useCallback(async () => {
    if (!isDirty) return

    setIsSaving(true)
    setSaveError(null)

    try {
      const previousRaw = project.raw_intake || ''
      const hasAiDoc = !!project.ai_parsed_intake

      // If there's no AI doc yet, offer to generate one
      if (!hasAiDoc && rawContent.trim()) {
        // Save raw first
        await onUpdate({
          raw_intake: rawContent,
          raw_intake_previous: previousRaw,
          intake_updated_at: new Date().toISOString(),
        })
        setIsDirty(false)

        // Offer to generate AI version
        const shouldGenerate = window.confirm('Generate AI-refined version of the intake?')
        if (shouldGenerate) {
          const result = await refine(rawContent, project.name)
          if (result) {
            await onUpdate({
              ai_parsed_intake: result.document,
              ai_parsed_at: new Date().toISOString(),
            })
            setAiContent(result.document)
          }
        }
      } else if (hasAiDoc && rawContent !== previousRaw) {
        // Analyze changes and ask user
        const result = await analyzeChanges(
          previousRaw,
          rawContent,
          project.ai_parsed_intake!,
          project.name
        )

        if (result) {
          onShowChangesDialog({
            changesSummary: result.changes_summary,
            suggestedUpdates: result.suggested_updates,
            updatedDocument: result.updated_document,
            onConfirm: async () => {
              // Update both raw and AI
              await onUpdate({
                raw_intake: rawContent,
                raw_intake_previous: previousRaw,
                ai_parsed_intake: result.updated_document,
                ai_parsed_at: new Date().toISOString(),
                intake_updated_at: new Date().toISOString(),
              })
              setAiContent(result.updated_document)
              setIsDirty(false)
            },
            onKeepCurrent: async () => {
              // Only update raw
              await onUpdate({
                raw_intake: rawContent,
                raw_intake_previous: previousRaw,
                intake_updated_at: new Date().toISOString(),
              })
              setIsDirty(false)
            },
          })
        } else {
          // Claude CLI failed - save raw content without AI analysis
          // The aiError state will show the error message from the hook
          await onUpdate({
            raw_intake: rawContent,
            raw_intake_previous: previousRaw,
            intake_updated_at: new Date().toISOString(),
          })
          setIsDirty(false)
        }
      } else {
        // Just save raw
        await onUpdate({
          raw_intake: rawContent,
          raw_intake_previous: previousRaw,
          intake_updated_at: new Date().toISOString(),
        })
        setIsDirty(false)
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [isDirty, rawContent, project, onUpdate, refine, analyzeChanges, onShowChangesDialog])

  // Regenerate AI content
  const handleRegenerate = useCallback(async () => {
    if (!rawContent.trim()) return

    const result = await refine(rawContent, project.name)
    if (result) {
      setAiContent(result.document)
      await onUpdate({
        ai_parsed_intake: result.document,
        ai_parsed_at: new Date().toISOString(),
      })
    }
  }, [rawContent, project.name, refine, onUpdate])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleString()
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-transparent">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('raw')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'raw'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Raw Intake
          {isDirty && <span className="ml-2 text-yellow-600 dark:text-yellow-400">*</span>}
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'ai'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          AI Refined
          {project.ai_parsed_at && (
            <span className="ml-2 text-green-600 dark:text-green-400 text-xs">
              (Generated)
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col p-4 space-y-3 overflow-hidden">
        {activeTab === 'raw' ? (
          <>
            <textarea
              value={rawContent}
              onChange={(e) => handleRawChange(e.target.value)}
              placeholder="Paste or type your raw project intake here..."
              className="flex-1 min-h-0 w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-500">
                {isDirty ? 'Unsaved changes' : 'No unsaved changes'}
              </div>
              <Button
                onClick={handleSaveRaw}
                disabled={!isDirty || isSaving || isProcessing}
              >
                {isSaving || isProcessing ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <div className="flex items-center gap-3">
                {project.ai_parsed_at ? (
                  <span>Generated on {formatDate(project.ai_parsed_at)}</span>
                ) : (
                  <span>No AI-refined version yet</span>
                )}
                {/* View/Edit Toggle */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-md p-0.5">
                  <button
                    onClick={() => setAiViewMode('view')}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      aiViewMode === 'view'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'
                    }`}
                  >
                    View
                  </button>
                  <button
                    onClick={() => setAiViewMode('edit')}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      aiViewMode === 'edit'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'
                    }`}
                  >
                    Edit
                  </button>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRegenerate}
                disabled={!rawContent.trim() || isProcessing}
              >
                {isProcessing ? 'Generating...' : 'Regenerate'}
              </Button>
            </div>
            {aiViewMode === 'view' ? (
              <div className="flex-1 min-h-0 w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white overflow-y-auto prose dark:prose-invert prose-sm max-w-none">
                {aiContent ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {aiContent}
                  </ReactMarkdown>
                ) : (
                  <p className="text-gray-400 italic">AI-refined content will appear here...</p>
                )}
              </div>
            ) : (
              <textarea
                value={aiContent}
                onChange={(e) => handleAiChange(e.target.value)}
                placeholder="AI-refined content will appear here..."
                className="flex-1 min-h-0 w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
              />
            )}
            {aiContent !== project.ai_parsed_intake && (
              <div className="flex items-center justify-end">
                <Button
                  onClick={handleSaveAiContent}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Error display */}
        {(saveError || aiError) && (
          <p className="text-sm text-red-400">{saveError || aiError}</p>
        )}
      </div>
    </div>
  )
}
