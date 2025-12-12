import { Modal } from '../common/Modal'
import { Button } from '../common/Button'

interface IntakeChangesDialogProps {
  isOpen: boolean
  onClose: () => void
  changesSummary: string
  suggestedUpdates: string
  updatedDocument: string
  onConfirm: () => void
  onKeepCurrent: () => void
}

export function IntakeChangesDialog({
  isOpen,
  onClose,
  changesSummary,
  suggestedUpdates,
  onConfirm,
  onKeepCurrent,
}: IntakeChangesDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const handleKeepCurrent = () => {
    onKeepCurrent()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update AI Document?">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-2">Changes Detected</h3>
          <div className="bg-gray-700 rounded-md p-3 text-sm text-gray-200 whitespace-pre-wrap max-h-40 overflow-y-auto">
            {changesSummary}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-2">Suggested Updates</h3>
          <div className="bg-gray-700 rounded-md p-3 text-sm text-gray-200 whitespace-pre-wrap max-h-40 overflow-y-auto">
            {suggestedUpdates}
          </div>
        </div>

        <p className="text-sm text-gray-400">
          Would you like to update the AI-refined document with these changes?
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleKeepCurrent}>
            Keep Current AI Doc
          </Button>
          <Button onClick={handleConfirm}>
            Update AI Document
          </Button>
        </div>
      </div>
    </Modal>
  )
}
