import { useState } from 'react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import type { JourneyInsert } from '../../types'

interface AddJourneyModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onSubmit: (journey: JourneyInsert) => Promise<void>
}

export function AddJourneyModal({ isOpen, onClose, projectId, onSubmit }: AddJourneyModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
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
        status: 'planning',
      })
      // Reset form
      setName('')
      setDescription('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create journey')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Journey">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Journey Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add user authentication"
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

        <p className="text-xs text-gray-500">
          The journey will be created in "Planning" status. Start it later to create a git worktree.
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
