import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  Journey,
  Project,
  ProposedChildJourney,
  ProposedJourneyStatus,
  JourneyInsert,
} from '@dev-orchestrator/shared'
import { useProposedChildJourneys, useJourneySpec, useJourneys, getSupabase } from '@dev-orchestrator/shared'
import { Button } from '../../common/Button'

type FilterTab = 'all' | ProposedJourneyStatus

interface PlanTabProps {
  journey: Journey
  project: Project | null
  onStageChange?: (newStage: string) => void
}

export function PlanTab({ journey, project, onStageChange }: PlanTabProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [sortReversed, setSortReversed] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [groupName, setGroupName] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [isCreatingAll, setIsCreatingAll] = useState(false)

  const { spec, loading: specLoading } = useJourneySpec(journey.id)
  const { journeys, createJourney, updateJourney, loading: journeysLoading } = useJourneys(journey.project_id)

  // Get child journeys for orphan detection (journeys created from this planning journey)
  // Use journey.proposed_child_journeys directly to avoid circular dependency with useProposedChildJourneys hook
  const rawProposals = (journey.proposed_child_journeys || []) as ProposedChildJourney[]
  const childJourneyIds = journeys
    .filter(j => rawProposals.some(p => p.generated_journey_id === j.id))
    .map(j => j.id)

  // Get existing group parents - feature journeys that have children OR were created as groups
  // (A journey is a group if it has child journeys OR has "(Group)" in its name)
  const existingGroups = journeys.filter(j =>
    j.type === 'feature' &&
    j.project_id === journey.project_id &&
    (journeys.some(child => child.parent_journey_id === j.id) || j.name.includes('(Group)'))
  )

  // Handler for updating proposed_child_journeys on the journey
  const handleJourneyUpdate = useCallback(async (updates: { proposed_child_journeys: ProposedChildJourney[] }) => {
    await updateJourney(journey.id, updates as Parameters<typeof updateJourney>[1])
  }, [journey.id, updateJourney])

  const {
    proposals,
    draftCount,
    addProposals,
    replaceAllProposals,
    updateProposal,
    batchUpdateProposals,
    deleteProposal,
    toggleReject,
    togglePunt,
    cleanupOrphanedReferences,
    getProposalsByStatus,
    reorderProposals,
  } = useProposedChildJourneys({
    journey,
    onJourneyUpdate: handleJourneyUpdate,
    childJourneyIds,
  })

  // Auto-cleanup orphaned references on mount
  useEffect(() => {
    if (proposals.length > 0) {
      cleanupOrphanedReferences()
    }
  }, [childJourneyIds.join(',')])

  // Generate proposals from AI
  const handleGenerate = useCallback(async () => {
    if (!spec?.content) {
      setAiError('No spec available. Please create a spec first.')
      return
    }

    setIsGenerating(true)
    setAiError(null)

    try {
      // Get existing proposals for context
      const existingProposals = proposals.map(p => ({
        name: p.name,
        description: p.description,
        status: p.status,
      }))

      const result = await window.electronAPI.claude.generateProposedChildJourneys(
        spec.content,
        journey.name,
        existingProposals,
        project?.root_path
      )

      if (!result.success || !result.data?.journeys) {
        setAiError(result.error || 'Failed to generate child journeys')
        return
      }

      if (proposals.length === 0) {
        // First generation - replace all
        await replaceAllProposals(
          result.data.journeys.map(j => ({
            name: j.name,
            description: j.description,
            early_plan: j.early_plan,
            checklist_items: j.checklist_items || [],
            status: 'draft' as ProposedJourneyStatus,
            generated_journey_id: null,
            sort_order: 0,
          }))
        )
      } else {
        // Append to existing
        await addProposals(
          result.data.journeys.map(j => ({
            name: j.name,
            description: j.description,
            early_plan: j.early_plan,
            checklist_items: j.checklist_items || [],
            status: 'draft' as ProposedJourneyStatus,
            generated_journey_id: null,
            sort_order: 0,
          }))
        )
      }

      // Advance to 'planning' stage if at 'speccing' or 'ui_planning'
      if (onStageChange) {
        const planningStages = ['speccing', 'ui_planning']
        if (planningStages.includes(journey.stage)) {
          onStageChange('planning')
        }
      }
    } catch (err) {
      console.error('Failed to generate child journeys:', err)
      setAiError(err instanceof Error ? err.message : 'Failed to generate child journeys')
    } finally {
      setIsGenerating(false)
    }
  }, [spec, journey.name, journey.stage, project, proposals, replaceAllProposals, addProposals, onStageChange])

  // Create a feature journey from a proposal (internal helper, doesn't update proposal status)
  const createJourneyFromProposal = useCallback(async (
    proposal: ProposedChildJourney,
    parentId?: string | null
  ): Promise<{ proposalId: string; journeyId: string }> => {
    // parent_journey_id is for grouping (e.g., "Frontend Group" containing frontend features)
    // spawned_from link is for tracking which planning journey this came from
    const insert: JourneyInsert = {
      project_id: journey.project_id,
      parent_journey_id: parentId || null,
      name: proposal.name,
      description: `${proposal.description}\n\n**Early Plan:**\n${proposal.early_plan}`,
      type: 'feature',
      stage: 'review_and_edit_plan',
    }

    const newJourney = await createJourney(insert)

    // Create a "spawned_from" link to the planning journey
    await getSupabase()
      .from('journey_links')
      .insert({
        from_journey_id: newJourney.id,
        to_journey_id: journey.id,
        relationship: 'spawned_from',
      })

    // TODO: Create checklist items for the new journey

    return { proposalId: proposal.id, journeyId: newJourney.id }
  }, [journey.project_id, journey.id, createJourney])

  // Create a single journey and update its proposal (for "Create" button on individual rows)
  const handleCreateJourney = useCallback(async (proposal: ProposedChildJourney, parentId?: string | null) => {
    const result = await createJourneyFromProposal(proposal, parentId)
    await updateProposal(proposal.id, {
      status: 'generated',
      generated_journey_id: result.journeyId,
    })
    return result
  }, [createJourneyFromProposal, updateProposal])

  // Create all draft journeys at once, optionally under a group parent
  // Uses batch update to avoid stale closure issues
  const handleCreateAll = useCallback(async (parentId?: string | null) => {
    const drafts = proposals.filter(p => p.status === 'draft')

    // Create all journeys and collect their IDs
    const results: Array<{ proposalId: string; journeyId: string }> = []
    for (const proposal of drafts) {
      const result = await createJourneyFromProposal(proposal, parentId)
      results.push(result)
    }

    // Batch update all proposals at once (avoids stale closure overwriting)
    await batchUpdateProposals(
      results.map(r => ({
        id: r.proposalId,
        updates: { status: 'generated' as const, generated_journey_id: r.journeyId },
      }))
    )

    // Check if all drafts are now generated - advance to 'complete' if so
    if (onStageChange && journey.stage === 'planning') {
      onStageChange('complete')
    }
  }, [proposals, createJourneyFromProposal, batchUpdateProposals, onStageChange, journey.stage])

  // Create all draft journeys as a new group
  const handleCreateAllAsGroup = useCallback(async () => {
    if (!groupName.trim()) return

    setIsCreatingAll(true)
    try {
      // First, create the group parent journey
      const groupInsert: JourneyInsert = {
        project_id: journey.project_id,
        name: `${groupName.trim()} (Group)`,
        description: `Group containing features from planning journey: ${journey.name}`,
        type: 'feature',
        stage: 'review_and_edit_plan',
      }

      const groupJourney = await createJourney(groupInsert)

      // Create a spawned_from link for the group as well
      await getSupabase()
        .from('journey_links')
        .insert({
          from_journey_id: groupJourney.id,
          to_journey_id: journey.id,
          relationship: 'spawned_from',
        })

      // Create all draft journeys under this group
      await handleCreateAll(groupJourney.id)

      // Clear the group name input
      setGroupName('')
    } finally {
      setIsCreatingAll(false)
    }
  }, [groupName, journey.project_id, journey.name, journey.id, createJourney, handleCreateAll])

  // Create all draft journeys under an existing group
  const handleCreateAllInExistingGroup = useCallback(async () => {
    if (!selectedGroupId) return

    setIsCreatingAll(true)
    try {
      await handleCreateAll(selectedGroupId)
      setSelectedGroupId(null)
    } finally {
      setIsCreatingAll(false)
    }
  }, [selectedGroupId, handleCreateAll])

  // Create all as standalone (no group)
  const handleCreateAllStandalone = useCallback(async () => {
    setIsCreatingAll(true)
    try {
      await handleCreateAll(null)
    } finally {
      setIsCreatingAll(false)
    }
  }, [handleCreateAll])

  // Get filtered and sorted proposals
  const filteredProposals = getProposalsByStatus(activeFilter)
  const sortedProposals = [...filteredProposals].sort((a, b) => {
    const order = a.sort_order - b.sort_order
    return sortReversed ? -order : order
  })

  // Drag and drop handlers
  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index)
  }, [])

  const handleDragOver = useCallback((index: number) => {
    setDragOverIndex(index)
  }, [])

  const handleDragEnd = useCallback(async () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const reordered = [...sortedProposals]
      const [removed] = reordered.splice(dragIndex, 1)
      reordered.splice(dragOverIndex, 0, removed)
      await reorderProposals(reordered.map(p => p.id))
    }
    setDragIndex(null)
    setDragOverIndex(null)
  }, [dragIndex, dragOverIndex, sortedProposals, reorderProposals])

  const filterTabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: proposals.length },
    { id: 'draft', label: 'Drafts', count: getProposalsByStatus('draft').length },
    { id: 'generated', label: 'Created', count: getProposalsByStatus('generated').length },
    { id: 'punted', label: 'Punted', count: getProposalsByStatus('punted').length },
    { id: 'rejected', label: 'Rejected', count: getProposalsByStatus('rejected').length },
    { id: 'cancelled', label: 'Cancelled', count: getProposalsByStatus('cancelled').length },
  ]

  const getLinkedJourney = (proposal: ProposedChildJourney) =>
    journeys.find(j => j.id === proposal.generated_journey_id)

  if (specLoading || journeysLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        Loading...
      </div>
    )
  }

  const hasSpec = !!spec?.content

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Proposed Child Journeys
          </h3>
          {proposals.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSortReversed(!sortReversed)}>
              {sortReversed ? 'Oldest First' : 'Newest First'}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !hasSpec}
            size="sm"
            title={!hasSpec ? 'Generate a spec first' : 'Generate child journeys from spec'}
          >
            {isGenerating
              ? 'Generating...'
              : proposals.length > 0
                ? 'Generate More'
                : 'Generate Journeys'}
          </Button>
        </div>
      </div>

      {/* Group Creation Options - shown when there are drafts */}
      {draftCount > 0 && (
        <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Create {draftCount} draft {draftCount === 1 ? 'journey' : 'journeys'}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Create standalone */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCreateAllStandalone}
                disabled={isCreatingAll}
              >
                {isCreatingAll ? 'Creating...' : 'Create Standalone'}
              </Button>

              {/* Create as new group */}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="New group name..."
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-40"
                />
                <Button
                  size="sm"
                  onClick={handleCreateAllAsGroup}
                  disabled={isCreatingAll || !groupName.trim()}
                  title={!groupName.trim() ? 'Enter a group name' : 'Create all as a new group'}
                >
                  Create as Group
                </Button>
              </div>

              {/* Create in existing group */}
              {existingGroups.length > 0 && (
                <div className="flex items-center gap-1">
                  <select
                    value={selectedGroupId || ''}
                    onChange={(e) => setSelectedGroupId(e.target.value || null)}
                    className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select existing group...</option>
                    {existingGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleCreateAllInExistingGroup}
                    disabled={isCreatingAll || !selectedGroupId}
                    title={!selectedGroupId ? 'Select a group' : 'Add all to existing group'}
                  >
                    Add to Group
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {proposals.length > 0 && (
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-4 overflow-x-auto">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === tab.id
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Error display */}
      {aiError && (
        <div className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
          {aiError}
        </div>
      )}

      {/* No spec warning */}
      {!hasSpec && proposals.length === 0 && (
        <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p>No spec available.</p>
          <p className="text-sm mt-2">Go to the Spec tab and create one first to generate child journeys.</p>
        </div>
      )}

      {/* Table */}
      {(hasSpec || proposals.length > 0) && (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
              <tr>
                <th className="w-8"></th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Journey
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Plan & Checklist
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedProposals.map((proposal, index) => (
                <ProposalRow
                  key={proposal.id}
                  proposal={proposal}
                  linkedJourney={getLinkedJourney(proposal)}
                  isEditing={editingId === proposal.id}
                  index={index}
                  onStartEdit={() => setEditingId(proposal.id)}
                  onEndEdit={() => setEditingId(null)}
                  onUpdateField={updateProposal}
                  onToggleReject={() => toggleReject(proposal.id)}
                  onPunt={() => togglePunt(proposal.id)}
                  onCreateJourney={() => handleCreateJourney(proposal)}
                  onDelete={() => deleteProposal(proposal.id)}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  isDragging={dragIndex === index}
                  isDragOver={dragOverIndex === index}
                />
              ))}
            </tbody>
          </table>

          {sortedProposals.length === 0 && hasSpec && (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              {activeFilter === 'all'
                ? 'No child journeys yet. Click "Generate Journeys" to break down the spec.'
                : `No ${activeFilter} journeys.`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Separate row component for inline editing
interface ProposalRowProps {
  proposal: ProposedChildJourney
  linkedJourney?: Journey
  isEditing: boolean
  index: number
  onStartEdit: () => void
  onEndEdit: () => void
  onUpdateField: (id: string, updates: Partial<ProposedChildJourney>) => Promise<ProposedChildJourney | null>
  onToggleReject: () => void
  onPunt: () => void
  onCreateJourney: () => void
  onDelete: () => void
  onDragStart: (index: number) => void
  onDragOver: (index: number) => void
  onDragEnd: () => void
  isDragging: boolean
  isDragOver: boolean
}

function ProposalRow({
  proposal,
  linkedJourney,
  isEditing,
  index,
  onStartEdit,
  onEndEdit,
  onUpdateField,
  onToggleReject,
  onPunt,
  onCreateJourney,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isDragOver,
}: ProposalRowProps) {
  const [localName, setLocalName] = useState(proposal.name)
  const [localDescription, setLocalDescription] = useState(proposal.description)
  const [localPlan, setLocalPlan] = useState(proposal.early_plan)
  const [localChecklist, setLocalChecklist] = useState<string[]>(proposal.checklist_items)
  const [focusedChecklistIndex, setFocusedChecklistIndex] = useState<number | null>(null)

  const rowRef = useRef<HTMLTableRowElement>(null)
  const checklistRefs = useRef<(HTMLInputElement | null)[]>([])
  const [showMenu, setShowMenu] = useState(false)

  // Sync local state when proposal changes
  useEffect(() => {
    setLocalName(proposal.name)
    setLocalDescription(proposal.description)
    setLocalPlan(proposal.early_plan)
    setLocalChecklist(proposal.checklist_items)
  }, [proposal.name, proposal.description, proposal.early_plan, proposal.checklist_items])

  const statusColors: Record<ProposedJourneyStatus, string> = {
    draft: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
    generated: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
    already_completed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400',
    punted: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  }

  const handleBlur = async (
    e: React.FocusEvent,
    field: 'name' | 'description' | 'early_plan' | 'checklist_items',
    value: string | string[]
  ) => {
    let finalValue: string | string[] = value
    if (field === 'checklist_items' && Array.isArray(value)) {
      finalValue = value.filter(item => item.trim())
    }

    const originalValue =
      field === 'name'
        ? proposal.name
        : field === 'description'
          ? proposal.description
          : field === 'early_plan'
            ? proposal.early_plan
            : proposal.checklist_items

    const currentValue = Array.isArray(value) ? value.filter(v => v.trim()) : value
    const origValue = Array.isArray(originalValue) ? originalValue : originalValue

    const hasChanged = Array.isArray(currentValue) && Array.isArray(origValue)
      ? JSON.stringify(currentValue) !== JSON.stringify(origValue)
      : currentValue !== origValue

    if (hasChanged) {
      await onUpdateField(proposal.id, { [field]: finalValue })
    }

    // Only end edit if focus is leaving the row entirely
    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (!relatedTarget || !rowRef.current?.contains(relatedTarget)) {
      onEndEdit()
    }
  }

  // Checklist item handlers
  const handleChecklistItemChange = (index: number, value: string) => {
    const updated = [...localChecklist]
    updated[index] = value
    setLocalChecklist(updated)
  }

  const handleChecklistKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Insert new item after current
      const updated = [...localChecklist]
      updated.splice(index + 1, 0, '')
      setLocalChecklist(updated)
      // Focus the new item after state updates
      setTimeout(() => {
        checklistRefs.current[index + 1]?.focus()
      }, 0)
    } else if (e.key === 'Backspace' && localChecklist[index] === '' && localChecklist.length > 1) {
      e.preventDefault()
      // Remove empty item and focus previous
      const updated = [...localChecklist]
      updated.splice(index, 1)
      setLocalChecklist(updated)
      setTimeout(() => {
        checklistRefs.current[Math.max(0, index - 1)]?.focus()
      }, 0)
    } else if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault()
      checklistRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowDown' && index < localChecklist.length - 1) {
      e.preventDefault()
      checklistRefs.current[index + 1]?.focus()
    }
  }

  const handleAddChecklistItem = () => {
    setLocalChecklist([...localChecklist, ''])
    setTimeout(() => {
      checklistRefs.current[localChecklist.length]?.focus()
    }, 0)
  }

  const handleRemoveChecklistItem = (index: number) => {
    const updated = [...localChecklist]
    updated.splice(index, 1)
    setLocalChecklist(updated)
  }

  const saveChecklist = async () => {
    const filtered = localChecklist.filter(item => item.trim())
    if (JSON.stringify(filtered) !== JSON.stringify(proposal.checklist_items)) {
      await onUpdateField(proposal.id, { checklist_items: filtered })
    }
  }

  const handleOpenJourney = () => {
    if (linkedJourney) {
      window.electronAPI.journeyDetail.open(linkedJourney.id, linkedJourney.project_id)
    }
  }

  return (
    <tr
      ref={rowRef}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver(index)
      }}
      onDragEnd={onDragEnd}
      className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
        proposal.status === 'cancelled' ? 'opacity-50' : ''
      } ${isDragging ? 'opacity-50 bg-blue-50 dark:bg-blue-900/20' : ''} ${
        isDragOver ? 'border-t-2 border-blue-500' : ''
      }`}
    >
      {/* Drag Handle */}
      <td className="px-2 py-3 align-top w-8 cursor-grab active:cursor-grabbing">
        <div className="flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
          </svg>
        </div>
      </td>

      {/* Column 1: Title + Description */}
      <td className="px-4 py-3 align-top">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded ${statusColors[proposal.status]}`}>
              {proposal.status}
            </span>
          </div>
          {isEditing ? (
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Title</label>
                <textarea
                  value={localName}
                  onChange={(e) => {
                    setLocalName(e.target.value)
                    // Auto-resize
                    e.target.style.height = 'auto'
                    e.target.style.height = e.target.scrollHeight + 'px'
                  }}
                  onBlur={(e) => handleBlur(e, 'name', localName)}
                  onFocus={(e) => {
                    // Set initial height on focus
                    e.target.style.height = 'auto'
                    e.target.style.height = e.target.scrollHeight + 'px'
                  }}
                  rows={1}
                  className="w-full px-3 py-2 text-sm font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-hidden"
                  autoFocus
                  style={{ minHeight: '38px' }}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Description</label>
                <textarea
                  value={localDescription}
                  onChange={(e) => {
                    setLocalDescription(e.target.value)
                    // Auto-resize
                    e.target.style.height = 'auto'
                    e.target.style.height = e.target.scrollHeight + 'px'
                  }}
                  onBlur={(e) => handleBlur(e, 'description', localDescription)}
                  onFocus={(e) => {
                    // Set initial height on focus
                    e.target.style.height = 'auto'
                    e.target.style.height = e.target.scrollHeight + 'px'
                  }}
                  rows={2}
                  className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-hidden"
                  style={{ minHeight: '60px' }}
                />
              </div>
            </div>
          ) : (
            <div
              onClick={onStartEdit}
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-2 -m-1 border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
            >
              <div className="font-medium text-gray-900 dark:text-white text-sm">{proposal.name}</div>
              <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">{proposal.description}</div>
            </div>
          )}
        </div>
      </td>

      {/* Column 2: Early Plan + Checklist */}
      <td className="px-4 py-3 align-top">
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Early Plan</label>
              <textarea
                value={localPlan}
                onChange={(e) => setLocalPlan(e.target.value)}
                onBlur={(e) => handleBlur(e, 'early_plan', localPlan)}
                rows={3}
                className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                Checklist Items ({localChecklist.filter(i => i.trim()).length})
              </label>
              <div className="space-y-1 border border-gray-200 dark:border-gray-600 rounded-md p-2 bg-gray-50 dark:bg-gray-800">
                {localChecklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 group">
                    <span className="text-gray-400 text-xs w-4 text-right">{i + 1}.</span>
                    <input
                      ref={el => { checklistRefs.current[i] = el }}
                      type="text"
                      value={item}
                      onChange={(e) => handleChecklistItemChange(i, e.target.value)}
                      onKeyDown={(e) => handleChecklistKeyDown(e, i)}
                      onBlur={() => saveChecklist()}
                      placeholder="Enter checklist item..."
                      className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleRemoveChecklistItem(i)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                      title="Remove item"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddChecklistItem}
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-1 px-2 py-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add item
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Press Enter to add new item, Backspace on empty to delete</p>
            </div>
          </div>
        ) : (
          <div
            onClick={onStartEdit}
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 -m-1 space-y-2"
          >
            <p className="text-gray-700 dark:text-gray-300 text-sm">{proposal.early_plan}</p>
            {proposal.checklist_items.length > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">Checklist ({proposal.checklist_items.length}):</span>
                <ul className="mt-1 space-y-0.5">
                  {proposal.checklist_items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-gray-400 w-4 text-right shrink-0">{i + 1}.</span>
                      <span className="text-gray-600 dark:text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </td>

      {/* Column 3: Actions */}
      <td className="px-4 py-3 align-top">
        <div className="flex items-start gap-2">
          <div className="flex flex-wrap gap-2 items-start">
            {proposal.status === 'generated' && linkedJourney ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    ✓ Created
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    linkedJourney.stage === 'deployed' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' :
                    linkedJourney.stage === 'implementing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {linkedJourney.stage.replace(/_/g, ' ')}
                  </span>
                </div>
                <button
                  onClick={handleOpenJourney}
                  className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open {linkedJourney.name}
                </button>
              </div>
            ) : proposal.status === 'draft' ? (
              <>
                <Button size="sm" onClick={onCreateJourney}>
                  Create
                </Button>
                <Button size="sm" variant="ghost" onClick={onPunt}>
                  Punt
                </Button>
                <Button size="sm" variant="ghost" onClick={onToggleReject}>
                  Reject
                </Button>
              </>
            ) : proposal.status === 'punted' ? (
              <Button size="sm" variant="secondary" onClick={onPunt}>
                Unpunt
              </Button>
            ) : proposal.status === 'rejected' ? (
              <Button size="sm" variant="secondary" onClick={onToggleReject}>
                Unreject
              </Button>
            ) : proposal.status === 'cancelled' ? (
              <span className="text-xs text-gray-500">
                Cancelled
                {proposal.cancelled_at && ` on ${new Date(proposal.cancelled_at).toLocaleDateString()}`}
              </span>
            ) : null}
          </div>

          {/* More actions menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20">
                  <button
                    onClick={() => {
                      onDelete()
                      setShowMenu(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}
