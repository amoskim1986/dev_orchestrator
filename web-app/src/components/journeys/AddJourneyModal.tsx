import { useState } from 'react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import type { JourneyInsert, JourneyType } from '@dev-orchestrator/shared'
import { getInitialStage } from '@dev-orchestrator/shared'

interface AddJourneyModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onSubmit: (journey: JourneyInsert) => Promise<unknown>
}

const journeyTypes: { type: JourneyType; icon: string; label: string; description: string }[] = [
  {
    type: 'feature_planning',
    icon: '📋',
    label: 'Feature Planning',
    description: 'Plan a new feature with specs, UI designs, and implementation plans',
  },
  {
    type: 'feature',
    icon: '✨',
    label: 'Feature Implementation',
    description: 'Implement a planned feature (requires an approved plan)',
  },
  {
    type: 'bug',
    icon: '🐛',
    label: 'Bug Fix',
    description: 'Investigate and fix a reported bug',
  },
  {
    type: 'investigation',
    icon: '🔍',
    label: 'Investigation',
    description: 'Research or explore a topic without a specific implementation goal',
  },
]

export function AddJourneyModal({ isOpen, onClose, projectId, onSubmit }: AddJourneyModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<JourneyType>('feature_planning')
  const [sourceUrl, setSourceUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        project_id: projectId,
        name: name.trim(),
        description: description.trim() || null,
        type,
        stage: getInitialStage(type),
        source_url: sourceUrl.trim() || null,
      })
      // Reset form
      setName('')
      setDescription('')
      setType('feature_planning')
      setSourceUrl('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create journey')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedType = journeyTypes.find(t => t.type === type)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Journey">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Journey Type Selector */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Journey Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {journeyTypes.map((jt) => (
              <button
                key={jt.type}
                type="button"
                onClick={() => setType(jt.type)}
                className={`text-left p-2 rounded-lg border transition-colors ${
                  type === jt.type
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{jt.icon}</span>
                  <span className="text-sm font-medium">{jt.label}</span>
                </div>
              </button>
            ))}
          </div>
          {selectedType && (
            <p className="text-xs text-gray-500 mt-1">{selectedType.description}</p>
          )}
        </div>

        <Input
          label="Journey Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === 'bug' ? 'Fix checkout validation error' : 'Add user authentication'}
          required
        />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-300">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of what this journey accomplishes..."
            rows={3}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <Input
          label="Source URL (optional)"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="Link to ticket, spec doc, or discussion..."
        />

        <p className="text-xs text-gray-500">
          {type === 'feature_planning' && 'Start with an intake, then refine into a spec and implementation plan.'}
          {type === 'feature' && 'For implementing features with an approved plan. Starts at plan review.'}
          {type === 'bug' && 'Track investigation, fixing, and testing of a bug.'}
          {type === 'investigation' && 'Research or explore without a specific implementation goal.'}
        </p>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Journey'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
