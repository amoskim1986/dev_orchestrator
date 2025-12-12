import { useState } from 'react'
import type { Journey, JourneyStage, JourneyUpdate } from '@dev-orchestrator/shared'
import { getStagesForType } from '@dev-orchestrator/shared'
import { TypeBadge } from './TypeBadge'
import { StageBadge, StageProgress } from './StageBadge'
import { Button } from '../common/Button'
import { Input } from '../common/Input'

interface JourneyDetailPanelProps {
  journey: Journey
  onClose: () => void
  onUpdate: (updates: JourneyUpdate) => Promise<void>
  onDelete: () => void
}

// Stage descriptions for each type
const stageDescriptions: Record<JourneyStage, string> = {
  // Feature Planning stages
  intake: 'Capture initial idea, requirements, and context',
  speccing: 'Define detailed specifications and acceptance criteria',
  ui_planning: 'Design UI/UX mockups and user flows',
  planning: 'Create implementation plan and break down tasks',
  review: 'Review plan with stakeholders before approval',
  approved: 'Plan approved and ready for implementation',
  // Feature stages
  review_and_edit_plan: 'Review and refine the implementation plan',
  implementing: 'Building the feature',
  testing: 'Writing and running tests',
  pre_prod_review: 'Final code review before deployment',
  merge_approved: 'Approved to merge to main branch',
  staging_qa: 'Testing in staging environment',
  deployed: 'Successfully deployed to production',
  // Investigation stages
  in_progress: 'Research and analysis underway',
  complete: 'Investigation completed with findings documented',
  // Bug stages
  reported: 'Bug has been reported and documented',
  investigating: 'Analyzing root cause',
  fixing: 'Implementing the fix',
}

export function JourneyDetailPanel({ journey, onClose, onUpdate, onDelete }: JourneyDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(journey.name)
  const [editDescription, setEditDescription] = useState(journey.description || '')
  const [editSourceUrl, setEditSourceUrl] = useState(journey.source_url || '')
  const [editTags, setEditTags] = useState(journey.tags?.join(', ') || '')
  const [isSaving, setIsSaving] = useState(false)

  const stages = getStagesForType(journey.type)
  const currentStageIndex = stages.indexOf(journey.stage)
  const nextStage = currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1] : null
  const prevStage = currentStageIndex > 0 ? stages[currentStageIndex - 1] : null

  const formatStageLabel = (stage: string) => {
    return stage
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onUpdate({
        name: editName.trim(),
        description: editDescription.trim() || null,
        source_url: editSourceUrl.trim() || null,
        tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
      })
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update journey:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleStageChange = async (newStage: JourneyStage) => {
    try {
      await onUpdate({ stage: newStage })
    } catch (err) {
      console.error('Failed to update stage:', err)
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-gray-900 border-l border-gray-700 shadow-2xl z-40 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-700">
        <div className="flex-1 min-w-0 pr-4">
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Journey name"
              className="text-lg font-semibold"
            />
          ) : (
            <h2 className="text-lg font-semibold text-white truncate">{journey.name}</h2>
          )}
          <div className="flex items-center gap-2 mt-2">
            <TypeBadge type={journey.type} />
            <StageBadge stage={journey.stage} type={journey.type} />
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-1"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Stage Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-300">Stage Progress</h3>
            <span className="text-xs text-gray-500">
              {currentStageIndex + 1} of {stages.length}
            </span>
          </div>
          <StageProgress stage={journey.stage} type={journey.type} />

          {/* Stage description */}
          <p className="text-sm text-gray-400 bg-gray-800/50 rounded-lg p-3">
            {stageDescriptions[journey.stage] || 'Working on this stage'}
          </p>

          {/* Stage Navigation */}
          <div className="flex gap-2">
            {prevStage && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleStageChange(prevStage as JourneyStage)}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {formatStageLabel(prevStage)}
              </Button>
            )}
            {nextStage && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleStageChange(nextStage as JourneyStage)}
              >
                {formatStageLabel(nextStage)}
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">Description</h3>
          {isEditing ? (
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Describe this journey..."
              rows={4}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          ) : (
            <p className="text-sm text-gray-400">
              {journey.description || 'No description'}
            </p>
          )}
        </div>

        {/* Source URL */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">Source URL</h3>
          {isEditing ? (
            <Input
              value={editSourceUrl}
              onChange={(e) => setEditSourceUrl(e.target.value)}
              placeholder="Link to ticket, spec, or discussion..."
            />
          ) : journey.source_url ? (
            <a
              href={journey.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:text-blue-300 underline break-all"
            >
              {journey.source_url}
            </a>
          ) : (
            <p className="text-sm text-gray-500">No source URL</p>
          )}
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">Tags</h3>
          {isEditing ? (
            <Input
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              placeholder="Comma-separated tags..."
            />
          ) : journey.tags && journey.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {journey.tags.map((tag, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No tags</p>
          )}
        </div>

        {/* Branch Info */}
        {journey.branch_name && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-300">Git Branch</h3>
            <code className="text-sm text-green-400 bg-gray-800 px-2 py-1 rounded font-mono block">
              {journey.branch_name}
            </code>
            {journey.worktree_path && (
              <p className="text-xs text-gray-500 font-mono truncate">
                {journey.worktree_path}
              </p>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-2 text-xs text-gray-500">
          <div>Created: {new Date(journey.created_at).toLocaleString()}</div>
          <div>Updated: {new Date(journey.updated_at).toLocaleString()}</div>
        </div>
      </div>

      {/* Actions Footer */}
      <div className="border-t border-gray-700 p-4 space-y-3">
        {/* Note about desktop app */}
        <p className="text-xs text-gray-500 text-center">
          Use the desktop app to launch Claude Code or VS Code
        </p>

        {/* Edit/Save/Delete */}
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsEditing(false)
                  setEditName(journey.name)
                  setEditDescription(journey.description || '')
                  setEditSourceUrl(journey.source_url || '')
                  setEditTags(journey.tags?.join(', ') || '')
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setIsEditing(true)} className="flex-1">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </Button>
              <Button variant="danger" onClick={onDelete}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
