import { useState, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useJourneySpec, useJourneyIntakes } from '@dev-orchestrator/shared'
import type { Journey, Project } from '../../../types'
import { Button } from '../../common/Button'

interface SpecTabProps {
  journey: Journey
  project: Project | null
  onStageChange?: (newStage: string) => void
}

// Format the structured spec into a readable markdown string
function formatSpec(spec: {
  overview: string
  goals: string[]
  nonGoals: string[]
  technicalApproach: {
    summary: string
    components: { name: string; purpose: string; changes: string }[]
  }
  dataModel: {
    newEntities: { name: string; fields: string[] }[]
    modifiedEntities: { name: string; changes: string }[]
  }
  apiChanges: {
    newEndpoints: { method: string; path: string; purpose: string }[]
    modifiedEndpoints: { method: string; path: string; changes: string }[]
  }
  uiChanges: {
    newScreens: { name: string; purpose: string }[]
    modifiedScreens: { name: string; changes: string }[]
  }
  testing: {
    unitTests: string[]
    integrationTests: string[]
    e2eTests: string[]
  }
  rollout: {
    featureFlags: string[]
    migrationSteps: string[]
    rollbackPlan: string
  }
  openQuestions: string[]
}): string {
  const sections: string[] = []

  sections.push(`## Overview\n${spec.overview}\n`)

  if (spec.goals.length > 0) {
    sections.push(`## Goals\n${spec.goals.map(g => `- ${g}`).join('\n')}\n`)
  }

  if (spec.nonGoals.length > 0) {
    sections.push(`## Non-Goals\n${spec.nonGoals.map(g => `- ${g}`).join('\n')}\n`)
  }

  if (spec.technicalApproach.summary || spec.technicalApproach.components.length > 0) {
    let techSection = `## Technical Approach\n${spec.technicalApproach.summary}\n`
    if (spec.technicalApproach.components.length > 0) {
      techSection += '\n### Components\n'
      spec.technicalApproach.components.forEach(c => {
        techSection += `\n**${c.name}**\n- Purpose: ${c.purpose}\n- Changes: ${c.changes}\n`
      })
    }
    sections.push(techSection)
  }

  if (spec.dataModel.newEntities.length > 0 || spec.dataModel.modifiedEntities.length > 0) {
    let dataSection = '## Data Model\n'
    if (spec.dataModel.newEntities.length > 0) {
      dataSection += '\n### New Entities\n'
      spec.dataModel.newEntities.forEach(e => {
        dataSection += `\n**${e.name}**\n${e.fields.map(f => `- ${f}`).join('\n')}\n`
      })
    }
    if (spec.dataModel.modifiedEntities.length > 0) {
      dataSection += '\n### Modified Entities\n'
      spec.dataModel.modifiedEntities.forEach(e => {
        dataSection += `\n**${e.name}**: ${e.changes}\n`
      })
    }
    sections.push(dataSection)
  }

  if (spec.apiChanges.newEndpoints.length > 0 || spec.apiChanges.modifiedEndpoints.length > 0) {
    let apiSection = '## API Changes\n'
    if (spec.apiChanges.newEndpoints.length > 0) {
      apiSection += '\n### New Endpoints\n'
      spec.apiChanges.newEndpoints.forEach(e => {
        apiSection += `- \`${e.method} ${e.path}\` - ${e.purpose}\n`
      })
    }
    if (spec.apiChanges.modifiedEndpoints.length > 0) {
      apiSection += '\n### Modified Endpoints\n'
      spec.apiChanges.modifiedEndpoints.forEach(e => {
        apiSection += `- \`${e.method} ${e.path}\` - ${e.changes}\n`
      })
    }
    sections.push(apiSection)
  }

  if (spec.uiChanges.newScreens.length > 0 || spec.uiChanges.modifiedScreens.length > 0) {
    let uiSection = '## UI Changes\n'
    if (spec.uiChanges.newScreens.length > 0) {
      uiSection += '\n### New Screens\n'
      spec.uiChanges.newScreens.forEach(s => {
        uiSection += `- **${s.name}**: ${s.purpose}\n`
      })
    }
    if (spec.uiChanges.modifiedScreens.length > 0) {
      uiSection += '\n### Modified Screens\n'
      spec.uiChanges.modifiedScreens.forEach(s => {
        uiSection += `- **${s.name}**: ${s.changes}\n`
      })
    }
    sections.push(uiSection)
  }

  if (spec.testing.unitTests.length > 0 || spec.testing.integrationTests.length > 0 || spec.testing.e2eTests.length > 0) {
    let testSection = '## Testing Strategy\n'
    if (spec.testing.unitTests.length > 0) {
      testSection += '\n### Unit Tests\n' + spec.testing.unitTests.map(t => `- ${t}`).join('\n') + '\n'
    }
    if (spec.testing.integrationTests.length > 0) {
      testSection += '\n### Integration Tests\n' + spec.testing.integrationTests.map(t => `- ${t}`).join('\n') + '\n'
    }
    if (spec.testing.e2eTests.length > 0) {
      testSection += '\n### E2E Tests\n' + spec.testing.e2eTests.map(t => `- ${t}`).join('\n') + '\n'
    }
    sections.push(testSection)
  }

  if (spec.rollout.featureFlags.length > 0 || spec.rollout.migrationSteps.length > 0 || spec.rollout.rollbackPlan) {
    let rolloutSection = '## Rollout Plan\n'
    if (spec.rollout.featureFlags.length > 0) {
      rolloutSection += '\n### Feature Flags\n' + spec.rollout.featureFlags.map(f => `- ${f}`).join('\n') + '\n'
    }
    if (spec.rollout.migrationSteps.length > 0) {
      rolloutSection += '\n### Migration Steps\n' + spec.rollout.migrationSteps.map((s, i) => `${i + 1}. ${s}`).join('\n') + '\n'
    }
    if (spec.rollout.rollbackPlan) {
      rolloutSection += '\n### Rollback Plan\n' + spec.rollout.rollbackPlan + '\n'
    }
    sections.push(rolloutSection)
  }

  if (spec.openQuestions.length > 0) {
    sections.push(`## Open Questions\n${spec.openQuestions.map(q => `- ${q}`).join('\n')}\n`)
  }

  return sections.join('\n')
}

type SpecMode = 'view' | 'edit'

export function SpecTab({ journey, project, onStageChange }: SpecTabProps) {
  const { spec, loading, error, createOrUpdateSpec, refetch } = useJourneySpec(journey.id)
  const { getLatestIntake, loading: intakesLoading } = useJourneyIntakes(journey.id)

  const [mode, setMode] = useState<SpecMode>('view')
  const [content, setContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRefining, setIsRefining] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')

  const latestIntake = getLatestIntake()
  const hasRefinedIntake = !!latestIntake?.refined_content

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

  const handleGenerate = useCallback(async () => {
    if (!latestIntake?.refined_content) {
      setAiError('No AI-refined intake available. Please refine the intake first.')
      return
    }

    setIsGenerating(true)
    setAiError(null)

    try {
      const result = await window.electronAPI.claude.generateSpec(
        latestIntake.refined_content,
        undefined, // projectContext
        undefined, // techStack
        project?.root_path // workingDirectory
      )

      if (!result.success || !result.data) {
        setAiError(result.error || 'Failed to generate spec')
        return
      }

      // Format the structured response into readable markdown
      const formattedSpec = formatSpec(result.data)

      // Save to database
      await createOrUpdateSpec(formattedSpec)
      await refetch()
      setContent(formattedSpec)
      setIsDirty(false)

      // Advance stage to 'speccing' when spec is generated from intake
      if (onStageChange && journey.stage === 'intake') {
        onStageChange('speccing')
      }
    } catch (err) {
      console.error('Failed to generate spec:', err)
      setAiError(err instanceof Error ? err.message : 'Failed to generate spec')
    } finally {
      setIsGenerating(false)
    }
  }, [latestIntake, project, createOrUpdateSpec, refetch, onStageChange, journey.stage])

  const handleApplyFeedback = useCallback(async () => {
    if (!feedback.trim() || !content.trim()) return

    setIsRefining(true)
    setAiError(null)

    try {
      const result = await window.electronAPI.claude.refineSpec(
        content,
        feedback,
        project?.root_path
      )

      if (!result.success || !result.data) {
        setAiError(result.error || 'Failed to refine spec')
        return
      }

      // Format the structured response into readable markdown
      const formattedSpec = formatSpec(result.data)

      // Save to database
      await createOrUpdateSpec(formattedSpec)
      await refetch()
      setContent(formattedSpec)
      setIsDirty(false)
      setFeedback('') // Clear feedback after successful application
    } catch (err) {
      console.error('Failed to refine spec:', err)
      setAiError(err instanceof Error ? err.message : 'Failed to refine spec')
    } finally {
      setIsRefining(false)
    }
  }, [content, feedback, project, createOrUpdateSpec, refetch])

  if (loading || intakesLoading) {
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
          onClick={handleGenerate}
          disabled={isGenerating || !hasRefinedIntake}
          title={!hasRefinedIntake ? 'Please refine the intake first' : 'Generate spec from refined intake'}
        >
          {isGenerating ? 'Generating...' : 'Generate with AI'}
        </Button>
      </div>

      {/* View/Edit Mode Toggle */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        <button
          onClick={() => setMode('view')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'view'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          View
        </button>
        <button
          onClick={() => setMode('edit')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'edit'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Edit
          {isDirty && <span className="ml-2 text-yellow-600 dark:text-yellow-400">*</span>}
        </button>
      </div>

      {/* AI Error */}
      {aiError && (
        <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{aiError}</p>
        </div>
      )}

      {/* No refined intake warning */}
      {!hasRefinedIntake && !content && (
        <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            No AI-refined intake available. Go to the Intake tab and refine it first, then come back to generate a spec.
          </p>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {mode === 'view' ? (
          /* View Mode */
          content ? (
            <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md prose dark:prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">No spec yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Generate one with AI or switch to Edit mode
              </p>
            </div>
          )
        ) : (
          /* Edit Mode */
          <>
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
              className="flex-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm min-h-[200px]"
            />

            {/* Actions for Edit Mode */}
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
          </>
        )}
      </div>

      {/* Feedback Section - shown in View mode when there's content */}
      {mode === 'view' && content && (
        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Feedback (use voice with Cmd+Shift+V)
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Type or speak your feedback to refine the spec..."
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm min-h-[80px]"
          />
          <div className="flex justify-end mt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleApplyFeedback}
              disabled={isRefining || !feedback.trim() || !content.trim()}
            >
              {isRefining ? 'Applying...' : 'Apply Feedback'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
