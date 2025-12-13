import { useState, useEffect } from 'react'
import { useJourneySpec } from '@dev-orchestrator/shared'
import type { Journey } from '../../../types'
import { Button } from '../../common/Button'

interface SpecTabProps {
  journey: Journey
}

export function SpecTab({ journey }: SpecTabProps) {
  const { spec, loading, error, createOrUpdateSpec } = useJourneySpec(journey.id)
  const [content, setContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (spec) {
      setContent(spec.content || '')
      setIsDirty(false)
    }
  }, [spec?.content])

  const handleSave = async () => {
    if (!content.trim()) return
    setIsSaving(true)
    try {
      await createOrUpdateSpec(content.trim())
      setIsDirty(false)
    } catch (err) {
      console.error('Failed to save spec:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        Loading spec...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-600 dark:text-red-400 p-4">
        Error loading spec: {error.message}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {spec ? `Version ${spec.version} • Last updated: ${new Date(spec.updated_at).toLocaleString()}` : 'No spec yet'}
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled
          title="Coming soon"
        >
          Generate with AI
        </Button>
      </div>

      {/* Editor */}
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value)
          setIsDirty(e.target.value !== (spec?.content || ''))
        }}
        placeholder="Write the specification for this journey...

## Overview
What is this feature/fix about?

## Requirements
- Requirement 1
- Requirement 2

## Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2

## Technical Notes
Any technical considerations..."
        className="flex-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm min-h-[300px]"
      />

      {/* Actions */}
      <div className="flex items-center justify-between mt-3">
        <div className="text-xs text-gray-500">
          {isDirty ? 'Unsaved changes' : spec ? 'All changes saved' : 'Start typing to create a spec'}
        </div>
        <div className="flex gap-2">
          {isDirty && spec && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setContent(spec.content || '')
                setIsDirty(false)
              }}
            >
              Discard
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!isDirty || isSaving || !content.trim()}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}
