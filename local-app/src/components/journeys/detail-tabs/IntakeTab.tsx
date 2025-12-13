import { useState, useEffect, useCallback } from 'react'
import { useJourneyIntakes } from '@dev-orchestrator/shared'
import type { Journey } from '../../../types'
import { Button } from '../../common/Button'

interface IntakeTabProps {
  journey: Journey
}

type SubTab = 'raw' | 'refined'

export function IntakeTab({ journey }: IntakeTabProps) {
  const { intakes, loading, error, createIntake, getLatestIntake, refetch } = useJourneyIntakes(journey.id)

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('raw')
  const [rawContent, setRawContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)

  const latestIntake = getLatestIntake()
  const currentIntake = selectedVersion
    ? intakes.find(i => i.version === selectedVersion)
    : latestIntake

  // Sync content when intake changes
  useEffect(() => {
    if (currentIntake) {
      setRawContent(currentIntake.raw_content || '')
      setIsDirty(false)
    }
  }, [currentIntake?.id, currentIntake?.raw_content])

  // Set selected version to latest on load
  useEffect(() => {
    if (latestIntake && selectedVersion === null) {
      setSelectedVersion(latestIntake.version)
    }
  }, [latestIntake, selectedVersion])

  const handleRawChange = useCallback((value: string) => {
    setRawContent(value)
    setIsDirty(value !== (currentIntake?.raw_content || ''))
  }, [currentIntake?.raw_content])

  const handleSave = async () => {
    if (!rawContent.trim()) return

    setIsSaving(true)
    try {
      // Create a new version
      await createIntake(rawContent.trim())
      await refetch()
      setIsDirty(false)
      // Select the new version (will be highest)
      setSelectedVersion(null) // Reset to trigger latest selection
    } catch (err) {
      console.error('Failed to save intake:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        Loading intakes...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-600 dark:text-red-400 p-4">
        Error loading intakes: {error.message}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Version Selector */}
      {intakes.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">Version:</span>
          <div className="flex gap-1">
            {intakes.map((intake) => (
              <button
                key={intake.id}
                onClick={() => setSelectedVersion(intake.version)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedVersion === intake.version
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                v{intake.version}
              </button>
            ))}
          </div>
          {latestIntake && selectedVersion === latestIntake.version && (
            <span className="text-xs text-green-600 dark:text-green-400">(Latest)</span>
          )}
        </div>
      )}

      {/* Sub-tabs: Raw / Refined */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        <button
          onClick={() => setActiveSubTab('raw')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeSubTab === 'raw'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Raw Intake
          {isDirty && <span className="ml-2 text-yellow-600 dark:text-yellow-400">*</span>}
        </button>
        <button
          onClick={() => setActiveSubTab('refined')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeSubTab === 'refined'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          AI Refined
          {currentIntake?.refined_content && (
            <span className="ml-2 text-green-600 dark:text-green-400 text-xs">(Available)</span>
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeSubTab === 'raw' ? (
          <>
            <textarea
              value={rawContent}
              onChange={(e) => handleRawChange(e.target.value)}
              placeholder="Paste or type your raw intake content here..."
              className="flex-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm min-h-[200px]"
            />
            <div className="flex items-center justify-between mt-3">
              <div className="text-xs text-gray-500">
                {isDirty ? 'Unsaved changes' :
                  currentIntake ? `Last saved: ${new Date(currentIntake.created_at).toLocaleString()}` :
                  'No intake yet'}
              </div>
              <div className="flex gap-2">
                {isDirty && currentIntake && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRawContent(currentIntake.raw_content || '')
                      setIsDirty(false)
                    }}
                  >
                    Discard
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  disabled={!isDirty || isSaving || !rawContent.trim()}
                >
                  {isSaving ? 'Saving...' : currentIntake ? 'Save New Version' : 'Save'}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            {currentIntake?.refined_content ? (
              <div className="flex-1 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-lg p-4 font-mono">
                  {currentIntake.refined_content}
                </pre>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-sm">No AI-refined content yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Save raw intake first, then use AI to refine
                </p>
                {/* TODO: Add AI refine button when hook is ready */}
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  disabled={!currentIntake?.raw_content}
                  onClick={() => {
                    // TODO: Trigger AI refinement
                    console.log('AI refinement not yet implemented')
                  }}
                >
                  Refine with AI
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Empty state for no intakes */}
      {intakes.length === 0 && activeSubTab === 'raw' && !rawContent && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 pointer-events-none">
          <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      )}
    </div>
  )
}
