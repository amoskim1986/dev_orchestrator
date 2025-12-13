import { useState } from 'react'
import { useJourneyChecklists, type ChecklistItem } from '@dev-orchestrator/shared'
import type { Journey } from '../../../types'
import { Button } from '../../common/Button'
import { Input } from '../../common/Input'

interface ChecklistsTabProps {
  journey: Journey
}

const ITEM_TYPE_ICONS: Record<ChecklistItem['type'], string> = {
  deliverable: '📦',
  test: '🧪',
  manual_check: '👁',
}

const ITEM_TYPE_LABELS: Record<ChecklistItem['type'], string> = {
  deliverable: 'Deliverable',
  test: 'Test',
  manual_check: 'Manual Check',
}

export function ChecklistsTab({ journey }: ChecklistsTabProps) {
  const {
    checklists,
    loading,
    error,
    createChecklist,
    toggleItem,
    addItem,
    removeItem,
    getCompletionPercentage,
    setActiveChecklist,
    deleteChecklist,
  } = useJourneyChecklists(journey.id)

  const [newLegName, setNewLegName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({})
  const [newItemTypes, setNewItemTypes] = useState<Record<string, ChecklistItem['type']>>({})

  const handleCreateChecklist = async () => {
    if (!newLegName.trim()) return
    setIsCreating(true)
    try {
      await createChecklist(newLegName.trim())
      setNewLegName('')
    } catch (err) {
      console.error('Failed to create checklist:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleAddItem = async (checklistId: string) => {
    const text = newItemTexts[checklistId]?.trim()
    if (!text) return

    const type = newItemTypes[checklistId] || 'deliverable'
    try {
      await addItem(checklistId, { text, type, done: false })
      setNewItemTexts(prev => ({ ...prev, [checklistId]: '' }))
    } catch (err) {
      console.error('Failed to add item:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        Loading checklists...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-400 p-4">
        Error loading checklists: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Checklists */}
      {checklists.map((checklist) => {
        const percentage = getCompletionPercentage(checklist.id)
        const completedCount = checklist.items.filter(i => i.done).length
        const totalCount = checklist.items.length

        return (
          <div key={checklist.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            {/* Checklist Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <h4 className="font-medium text-white">{checklist.leg_name}</h4>
                {checklist.is_active && (
                  <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded">
                    Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {completedCount}/{totalCount} complete
                </span>
                {!checklist.is_active && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveChecklist(checklist.id)}
                  >
                    Set Active
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm('Delete this checklist?')) {
                      deleteChecklist(checklist.id)
                    }
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  Delete
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-gray-700">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>

            {/* Items */}
            <div className="p-3 space-y-2">
              {checklist.items.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-2 rounded transition-colors ${
                    item.done ? 'bg-gray-900/50' : 'hover:bg-gray-700/50'
                  }`}
                >
                  <button
                    onClick={() => toggleItem(checklist.id, index)}
                    className={`flex-shrink-0 w-5 h-5 rounded border transition-colors ${
                      item.done
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'border-gray-500 hover:border-gray-400'
                    }`}
                  >
                    {item.done && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span className="text-lg" title={ITEM_TYPE_LABELS[item.type]}>
                    {ITEM_TYPE_ICONS[item.type]}
                  </span>
                  <span className={`flex-1 text-sm ${item.done ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                    {item.text}
                  </span>
                  {item.done && item.done_at && (
                    <span className="text-xs text-gray-500">
                      {new Date(item.done_at).toLocaleDateString()}
                    </span>
                  )}
                  <button
                    onClick={() => removeItem(checklist.id, index)}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              {/* Add Item */}
              <div className="flex items-center gap-2 pt-2">
                <select
                  value={newItemTypes[checklist.id] || 'deliverable'}
                  onChange={(e) => setNewItemTypes(prev => ({
                    ...prev,
                    [checklist.id]: e.target.value as ChecklistItem['type']
                  }))}
                  className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                >
                  <option value="deliverable">📦 Deliverable</option>
                  <option value="test">🧪 Test</option>
                  <option value="manual_check">👁 Manual Check</option>
                </select>
                <Input
                  value={newItemTexts[checklist.id] || ''}
                  onChange={(e) => setNewItemTexts(prev => ({
                    ...prev,
                    [checklist.id]: e.target.value
                  }))}
                  placeholder="Add item..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddItem(checklist.id)
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => handleAddItem(checklist.id)}
                  disabled={!newItemTexts[checklist.id]?.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        )
      })}

      {/* Empty State */}
      {checklists.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className="text-sm">No checklists yet</p>
          <p className="text-xs text-gray-500">Create a checklist to track implementation tasks</p>
        </div>
      )}

      {/* Add Checklist */}
      <div className="flex items-center gap-2 p-3 bg-gray-800/50 rounded-lg border border-dashed border-gray-600">
        <Input
          value={newLegName}
          onChange={(e) => setNewLegName(e.target.value)}
          placeholder="New leg/phase name (e.g., 'Backend Setup')"
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleCreateChecklist()
            }
          }}
        />
        <Button
          onClick={handleCreateChecklist}
          disabled={!newLegName.trim() || isCreating}
        >
          {isCreating ? 'Creating...' : 'Add Checklist'}
        </Button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500 pt-2">
        <span>Legend:</span>
        <span>📦 Deliverable</span>
        <span>🧪 Test</span>
        <span>👁 Manual Check</span>
      </div>
    </div>
  )
}
