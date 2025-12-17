import { useState, useCallback } from 'react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import type { JourneyInsert, JourneyType } from '../../types'
import { getInitialStage } from '../../types'
import { JourneyIdeaInput } from './JourneyIdeaInput'

interface AddJourneyModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectName: string
  onSubmit: (journey: JourneyInsert) => Promise<unknown>
}

export function AddJourneyModal({ isOpen, onClose, projectId, projectName, onSubmit }: AddJourneyModalProps) {
  const [error, setError] = useState('')

  const handleIdeaSubmit = useCallback(
    async (parsed: { name: string; description: string; early_plan: string; type: JourneyType }) => {
      setError('')
      try {
        await onSubmit({
          project_id: projectId,
          name: parsed.name,
          description: `${parsed.description}\n\n**Early Plan:**\n${parsed.early_plan}`,
          type: parsed.type,
          stage: getInitialStage(parsed.type),
          source_url: null,
        })
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create journey')
        throw err // Re-throw so JourneyIdeaInput doesn't clear the input
      }
    },
    [projectId, onSubmit, onClose]
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Journey">
      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Describe your feature, bug, or investigation. AI will extract the title, description, and detect the journey type.
        </p>

        <JourneyIdeaInput
          projectName={projectName}
          onSubmit={handleIdeaSubmit}
          placeholder="Example: I need to add a dark mode toggle to the settings page. It should save the preference and apply it across all screens..."
          showTypeSelector={true}
        />

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <div className="flex justify-end pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}
