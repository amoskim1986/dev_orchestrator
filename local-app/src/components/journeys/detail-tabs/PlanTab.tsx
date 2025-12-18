import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
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

type SortOrder = 'execution' | 'newest' | 'oldest'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  appliedChanges?: boolean
}

export function PlanTab({ journey, project, onStageChange }: PlanTabProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('execution')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [groupName, setGroupName] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [isCreatingAll, setIsCreatingAll] = useState(false)
  const [showPublishPanel, setShowPublishPanel] = useState(false)

  // Chat panel state
  const [showChatPanel, setShowChatPanel] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatProcessing, setIsChatProcessing] = useState(false)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const chatMessagesRef = useRef<HTMLDivElement>(null)

  // Manual add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newJourneyName, setNewJourneyName] = useState('')
  const [newJourneyDescription, setNewJourneyDescription] = useState('')
  const [isFleshingOut, setIsFleshingOut] = useState(false)

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
    getAvailableParents,
    setProposalParent,
    toggleGroup,
    ungroupChildren,
    uncancelProposal,
    unpublishProposal,
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

  // Publish preserving draft groupings - parents become groups, children go under them
  const handlePublishPreservingGroupings = useCallback(async () => {
    setIsCreatingAll(true)
    try {
      const drafts = proposals.filter(p => p.status === 'draft')
      const topLevelDrafts = drafts.filter(p => !p.proposed_parent_id)
      const childDrafts = drafts.filter(p => p.proposed_parent_id)

      // Map from proposal ID to created journey ID
      const proposalToJourneyId = new Map<string, string>()
      const results: Array<{ proposalId: string; journeyId: string }> = []

      // First, create top-level drafts
      // If a top-level draft has children, create it as a group
      for (const proposal of topLevelDrafts) {
        const hasChildren = childDrafts.some(c => c.proposed_parent_id === proposal.id)
        const result = await createJourneyFromProposal(proposal, null)
        proposalToJourneyId.set(proposal.id, result.journeyId)
        results.push(result)

        // If it has children and doesn't already have "(Group)" in name, update the name
        if (hasChildren && !proposal.name.includes('(Group)')) {
          const supabase = getSupabase()
          await supabase
            .from('journeys')
            .update({ name: `${proposal.name} (Group)` })
            .eq('id', result.journeyId)
        }
      }

      // Then, create child drafts under their respective parents
      for (const proposal of childDrafts) {
        const parentJourneyId = proposal.proposed_parent_id
          ? proposalToJourneyId.get(proposal.proposed_parent_id)
          : null
        const result = await createJourneyFromProposal(proposal, parentJourneyId || null)
        results.push(result)
      }

      // Batch update all proposals
      await batchUpdateProposals(
        results.map(r => ({
          id: r.proposalId,
          updates: { status: 'generated' as const, generated_journey_id: r.journeyId },
        }))
      )

      // Close publish panel
      setShowPublishPanel(false)

      // Advance stage if appropriate
      if (onStageChange && journey.stage === 'planning') {
        onStageChange('complete')
      }
    } finally {
      setIsCreatingAll(false)
    }
  }, [proposals, createJourneyFromProposal, batchUpdateProposals, onStageChange, journey.stage])

  // Get filtered and sorted proposals
  const filteredProposals = getProposalsByStatus(activeFilter)
  const sortedProposals = useMemo(() => {
    return [...filteredProposals].sort((a, b) => {
      switch (sortOrder) {
        case 'execution':
          return a.sort_order - b.sort_order
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        default:
          return 0
      }
    })
  }, [filteredProposals, sortOrder])

  // Build hierarchical structure for display
  const hierarchicalProposals = useMemo(() => {
    // Get top-level proposals (no parent or parent not in filtered list)
    const filteredIds = new Set(sortedProposals.map(p => p.id))
    const topLevel = sortedProposals.filter(p =>
      !p.proposed_parent_id || !filteredIds.has(p.proposed_parent_id)
    )

    // Build map of children
    const childrenMap = new Map<string, ProposedChildJourney[]>()
    sortedProposals.forEach(p => {
      if (p.proposed_parent_id && filteredIds.has(p.proposed_parent_id)) {
        const children = childrenMap.get(p.proposed_parent_id) || []
        children.push(p)
        childrenMap.set(p.proposed_parent_id, children)
      }
    })

    return { topLevel, childrenMap }
  }, [sortedProposals])

  // Get draft groups (drafts marked as groups or that have children)
  const draftGroups = useMemo(() => {
    return proposals.filter(p =>
      p.status === 'draft' &&
      (p.is_group || proposals.some(child => child.proposed_parent_id === p.id))
    )
  }, [proposals])


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

  // Open spec in new window for side-by-side reading
  const handleViewSpec = useCallback(() => {
    if (!spec?.content) return
    window.electronAPI.markdownViewer.open(`spec-${journey.id}`, {
      title: `Spec: ${journey.name}`,
      content: spec.content,
      journeyId: journey.id,
    })
  }, [spec, journey.id, journey.name])

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [chatMessages])

  // Chat handler - sends message to AI and processes response
  const handleChatSubmit = useCallback(async () => {
    if (!chatInput.trim() || isChatProcessing) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date(),
    }

    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')
    setIsChatProcessing(true)

    try {
      // Build context for AI
      const proposalsContext = proposals.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        early_plan: p.early_plan,
        status: p.status,
        is_group: p.is_group,
        checklist_items: p.checklist_items,
      }))

      const prompt = `You are helping refine proposed child journeys for a feature planning journey.

CURRENT SPEC:
${spec?.content || 'No spec available'}

CURRENT PROPOSALS:
${JSON.stringify(proposalsContext, null, 2)}

USER REQUEST: ${userMessage.content}

Based on the user's request, provide a helpful response. If the user is asking for changes to the proposals (like adding, updating, removing, or reorganizing), respond with:
1. A brief explanation of what you'll do
2. A JSON block with the changes in this format:

\`\`\`json
{
  "action": "add" | "update" | "remove" | "reorder",
  "changes": [
    {
      "type": "add",
      "proposal": { "name": "...", "description": "...", "early_plan": "...", "checklist_items": ["..."] }
    },
    {
      "type": "update",
      "id": "proposal-id",
      "updates": { "name": "...", "description": "..." }
    },
    {
      "type": "remove",
      "id": "proposal-id"
    }
  ]
}
\`\`\`

If the user is just asking a question, answer it helpfully without including a JSON block.`

      const result = await window.electronAPI.claude.query({
        prompt,
        workingDirectory: project?.root_path,
        timeout: 60000,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to get AI response')
      }

      const assistantContent = result.rawOutput || ''

      // Try to extract and apply changes from JSON block
      let appliedChanges = false
      const jsonMatch = assistantContent.match(/```json\s*([\s\S]*?)```/)
      if (jsonMatch) {
        try {
          const changesData = JSON.parse(jsonMatch[1])
          if (changesData.changes && Array.isArray(changesData.changes)) {
            for (const change of changesData.changes) {
              if (change.type === 'add' && change.proposal) {
                await addProposals([{
                  name: change.proposal.name,
                  description: change.proposal.description || '',
                  early_plan: change.proposal.early_plan || '',
                  checklist_items: change.proposal.checklist_items || [],
                  status: 'draft',
                  generated_journey_id: null,
                  sort_order: proposals.length,
                }])
              } else if (change.type === 'update' && change.id) {
                await updateProposal(change.id, change.updates)
              } else if (change.type === 'remove' && change.id) {
                await deleteProposal(change.id)
              }
            }
            appliedChanges = true
          }
        } catch {
          // JSON parsing failed, just show the response
        }
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        appliedChanges,
      }
      setChatMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Unknown error occurred'}`,
        timestamp: new Date(),
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setIsChatProcessing(false)
    }
  }, [chatInput, isChatProcessing, proposals, spec, project?.root_path, addProposals, updateProposal, deleteProposal])

  // Manual add handler - creates a new proposal and optionally fleshes it out with AI
  const handleManualAdd = useCallback(async (fleshOut: boolean) => {
    if (!newJourneyName.trim()) return

    if (fleshOut) {
      setIsFleshingOut(true)
      try {
        const prompt = `Based on the following spec and the user's journey idea, create a detailed proposed child journey.

SPEC:
${spec?.content || 'No spec available'}

JOURNEY IDEA:
Name: ${newJourneyName}
${newJourneyDescription ? `Description: ${newJourneyDescription}` : ''}

Create a complete journey proposal with:
1. A refined name (if needed)
2. A detailed description
3. An early implementation plan
4. A checklist of specific tasks/items

Respond with ONLY a JSON object in this format:
{
  "name": "Journey name",
  "description": "Detailed description of what this journey accomplishes",
  "early_plan": "Step by step implementation approach",
  "checklist_items": ["Task 1", "Task 2", "Task 3"]
}`

        const result = await window.electronAPI.claude.query({
          prompt,
          workingDirectory: project?.root_path,
          timeout: 30000,
        })

        if (result.success && result.rawOutput) {
          // Try to parse JSON from the response
          const jsonMatch = result.rawOutput.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const proposal = JSON.parse(jsonMatch[0])
            await addProposals([{
              name: proposal.name || newJourneyName,
              description: proposal.description || newJourneyDescription,
              early_plan: proposal.early_plan || '',
              checklist_items: proposal.checklist_items || [],
              status: 'draft',
              generated_journey_id: null,
              sort_order: proposals.length,
            }])
          }
        }
      } catch (err) {
        // Fall back to adding without AI
        await addProposals([{
          name: newJourneyName,
          description: newJourneyDescription,
          early_plan: '',
          checklist_items: [],
          status: 'draft',
          generated_journey_id: null,
          sort_order: proposals.length,
        }])
      } finally {
        setIsFleshingOut(false)
      }
    } else {
      await addProposals([{
        name: newJourneyName,
        description: newJourneyDescription,
        early_plan: '',
        checklist_items: [],
        status: 'draft',
        generated_journey_id: null,
        sort_order: proposals.length,
      }])
    }

    setNewJourneyName('')
    setNewJourneyDescription('')
    setShowAddForm(false)
  }, [newJourneyName, newJourneyDescription, spec, project?.root_path, proposals.length, addProposals])

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
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              <option value="execution">Execution Order</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasSpec && (
            <Button
              onClick={handleViewSpec}
              variant="secondary"
              size="sm"
              title="Open spec in new window for side-by-side reading"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Spec
            </Button>
          )}
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            variant="secondary"
            size="sm"
            title="Add a journey manually"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </Button>
          <Button
            onClick={() => setShowChatPanel(!showChatPanel)}
            variant={showChatPanel ? 'primary' : 'secondary'}
            size="sm"
            title="Open chat to ask questions or request changes"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Chat
          </Button>
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

      {/* Draft Status Bar - shown when there are drafts */}
      {draftCount > 0 && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-white">{draftCount}</span> draft{draftCount !== 1 ? 's' : ''}
              {draftGroups.length > 0 && (
                <span className="ml-2 text-xs">
                  ({draftGroups.length} group{draftGroups.length !== 1 ? 's' : ''})
                </span>
              )}
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => setShowPublishPanel(!showPublishPanel)}
          >
            {showPublishPanel ? 'Hide Publish Options' : 'Publish to Feature Journeys...'}
          </Button>
        </div>
      )}

      {/* Publish Panel - collapsible */}
      {showPublishPanel && draftCount > 0 && (
        <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Publish {draftCount} draft{draftCount !== 1 ? 's' : ''} as Feature Journeys
              </span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400">
              Publishing will create actual feature journeys from your drafts.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {/* Publish preserving draft groupings - primary option if there are groups */}
              {draftGroups.length > 0 && (
                <Button
                  size="sm"
                  onClick={handlePublishPreservingGroupings}
                  disabled={isCreatingAll}
                  title="Publish using your draft groupings - parents become group journeys"
                >
                  {isCreatingAll ? 'Publishing...' : 'Publish Preserving Groupings'}
                </Button>
              )}

              {/* Publish standalone (ungrouped) */}
              <Button
                variant={draftGroups.length > 0 ? 'secondary' : 'primary'}
                size="sm"
                onClick={handleCreateAllStandalone}
                disabled={isCreatingAll}
                title="Publish all drafts as standalone journeys (ignores groupings)"
              >
                {isCreatingAll ? 'Publishing...' : 'Publish All Standalone'}
              </Button>

              {/* Publish as new group */}
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
                  title={!groupName.trim() ? 'Enter a group name' : 'Publish all under a new group'}
                >
                  Publish as Group
                </Button>
              </div>

              {/* Publish to existing group */}
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
                    title={!selectedGroupId ? 'Select a group' : 'Publish all to existing group'}
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

      {/* Manual Add Form */}
      {showAddForm && (
        <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Add New Journey Proposal
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={newJourneyName}
                onChange={(e) => setNewJourneyName(e.target.value)}
                placeholder="Journey name (e.g., 'Implement user authentication')"
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-full"
                autoFocus
              />
              <textarea
                value={newJourneyDescription}
                onChange={(e) => setNewJourneyDescription(e.target.value)}
                placeholder="Optional: Brief description or notes..."
                rows={2}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-full resize-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleManualAdd(true)}
                disabled={!newJourneyName.trim() || isFleshingOut}
                title="Add and let AI fill in the details"
              >
                {isFleshingOut ? 'Generating...' : 'Add & Flesh Out with AI'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleManualAdd(false)}
                disabled={!newJourneyName.trim() || isFleshingOut}
                title="Add as-is without AI enhancement"
              >
                Add As-Is
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowAddForm(false)
                  setNewJourneyName('')
                  setNewJourneyDescription('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
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
              {(() => {
                let flatIndex = 0
                const renderProposal = (proposal: ProposedChildJourney, depth: number = 0): React.ReactNode => {
                  const currentIndex = flatIndex++
                  const children = hierarchicalProposals.childrenMap.get(proposal.id) || []
                  const hasChildren = children.length > 0
                  return (
                    <>
                      <ProposalRow
                        key={proposal.id}
                        proposal={proposal}
                        linkedJourney={getLinkedJourney(proposal)}
                        isEditing={editingId === proposal.id}
                        index={currentIndex}
                        depth={depth}
                        hasChildren={hasChildren}
                        childCount={children.length}
                        availableParents={getAvailableParents(proposal.id)}
                        onStartEdit={() => setEditingId(proposal.id)}
                        onEndEdit={() => setEditingId(null)}
                        onUpdateField={updateProposal}
                        onToggleReject={() => toggleReject(proposal.id)}
                        onPunt={() => togglePunt(proposal.id)}
                        onDelete={() => deleteProposal(proposal.id)}
                        onSetParent={(parentId) => setProposalParent(proposal.id, parentId)}
                        onToggleGroup={() => toggleGroup(proposal.id)}
                        onUngroupChildren={() => ungroupChildren(proposal.id)}
                        onUncancel={() => uncancelProposal(proposal.id)}
                        onUnpublish={() => unpublishProposal(proposal.id)}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                        isDragging={dragIndex === currentIndex}
                        isDragOver={dragOverIndex === currentIndex}
                      />
                      {children.map(child => renderProposal(child, depth + 1))}
                    </>
                  )
                }
                return hierarchicalProposals.topLevel.map(proposal => renderProposal(proposal))
              })()}
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

      {/* Chat Panel - slide up from bottom */}
      {showChatPanel && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col" style={{ height: '300px' }}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Chat about Proposals
              </span>
            </div>
            <button
              onClick={() => setShowChatPanel(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chat Messages */}
          <div
            ref={chatMessagesRef}
            className="flex-1 overflow-auto p-4 space-y-3"
          >
            {chatMessages.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
                <p>Ask questions or request changes to your proposals.</p>
                <p className="text-xs mt-1">Examples: "Add a journey for error handling", "Split the auth journey into two", "What's missing from this plan?"</p>
              </div>
            )}
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content.replace(/```json[\s\S]*?```/g, '[Changes applied]')}</p>
                  {msg.appliedChanges && (
                    <div className="mt-1 text-xs text-green-300 dark:text-green-400 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Changes applied
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isChatProcessing && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-700 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <textarea
                ref={chatInputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleChatSubmit()
                  }
                }}
                placeholder="Ask a question or request changes..."
                rows={1}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              />
              <Button
                size="sm"
                onClick={handleChatSubmit}
                disabled={!chatInput.trim() || isChatProcessing}
              >
                Send
              </Button>
            </div>
          </div>
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
  depth: number
  hasChildren: boolean
  childCount: number
  availableParents: ProposedChildJourney[]
  onStartEdit: () => void
  onEndEdit: () => void
  onUpdateField: (id: string, updates: Partial<ProposedChildJourney>) => Promise<ProposedChildJourney | null>
  onToggleReject: () => void
  onPunt: () => void
  onDelete: () => void
  onSetParent: (parentId: string | null) => void
  onToggleGroup: () => void
  onUngroupChildren: () => void
  onUncancel: () => void
  onUnpublish: () => void
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
  depth,
  hasChildren,
  childCount,
  availableParents,
  onStartEdit,
  onEndEdit,
  onUpdateField,
  onToggleReject,
  onPunt,
  onDelete,
  onSetParent,
  onToggleGroup,
  onUngroupChildren,
  onUncancel,
  onUnpublish,
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

  const rowRef = useRef<HTMLTableRowElement>(null)
  const checklistRefs = useRef<(HTMLInputElement | null)[]>([])
  const [showMenu, setShowMenu] = useState(false)
  const [showParentSelector, setShowParentSelector] = useState(false)

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
      {/* Drag Handle with Indentation */}
      <td className="py-3 align-top cursor-grab active:cursor-grabbing" style={{ paddingLeft: `${8 + depth * 24}px`, paddingRight: '8px' }}>
        <div className="flex items-center gap-1">
          {depth > 0 && (
            <span className="text-gray-300 dark:text-gray-600 text-xs mr-1">└</span>
          )}
          <div className="flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
            </svg>
          </div>
        </div>
      </td>

      {/* Column 1: Title + Description */}
      <td className="px-4 py-3 align-top">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded ${statusColors[proposal.status]}`}>
              {proposal.status}
            </span>
            {proposal.is_group && proposal.status === 'draft' && (
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400">
                group{hasChildren ? ` (${childCount})` : ''}
              </span>
            )}
            {proposal.proposed_parent_id && proposal.status === 'draft' && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                → in group
              </span>
            )}
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
          <div className="flex flex-col gap-2">
            {proposal.status === 'generated' && linkedJourney ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    ✓ Published
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
                  Open Journey
                </button>
                <Button size="sm" variant="ghost" onClick={onUnpublish}>
                  Unpublish
                </Button>
              </div>
            ) : proposal.status === 'draft' ? (
              <div className="space-y-2">
                {/* Mark as Group toggle */}
                <button
                  onClick={onToggleGroup}
                  className={`flex items-center gap-1 text-xs px-2 py-1 border rounded ${
                    proposal.is_group
                      ? 'text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  {proposal.is_group ? 'Is Group ✓' : 'Mark as Group'}
                </button>

                {/* Parent assignment dropdown - only show if not marked as a group */}
                {!proposal.is_group && (
                  <div className="relative">
                    <button
                      onClick={() => setShowParentSelector(!showParentSelector)}
                      className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-2 py-1 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {proposal.proposed_parent_id ? 'Change Group' : 'Assign to Group'}
                    </button>
                    {showParentSelector && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowParentSelector(false)} />
                        <div className="absolute left-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
                          {proposal.proposed_parent_id && (
                            <button
                              onClick={() => {
                                onSetParent(null)
                                setShowParentSelector(false)
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600"
                            >
                              ✕ Remove from group
                            </button>
                          )}
                          {availableParents.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">
                              No groups available. Mark a draft as a group first.
                            </div>
                          ) : (
                            availableParents.map(parent => (
                              <button
                                key={parent.id}
                                onClick={() => {
                                  onSetParent(parent.id)
                                  setShowParentSelector(false)
                                }}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  parent.id === proposal.proposed_parent_id
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {parent.name}
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Ungroup children button */}
                {hasChildren && (
                  <button
                    onClick={onUngroupChildren}
                    className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-2 py-1 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Ungroup Children
                  </button>
                )}

                {/* Status actions */}
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" onClick={onPunt}>
                    Punt
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onToggleReject}>
                    Reject
                  </Button>
                </div>
              </div>
            ) : proposal.status === 'punted' ? (
              <Button size="sm" variant="secondary" onClick={onPunt}>
                Unpunt
              </Button>
            ) : proposal.status === 'rejected' ? (
              <Button size="sm" variant="secondary" onClick={onToggleReject}>
                Unreject
              </Button>
            ) : proposal.status === 'cancelled' ? (
              <div className="space-y-1">
                <span className="text-xs text-gray-500 block">
                  Cancelled
                  {proposal.cancelled_at && ` on ${new Date(proposal.cancelled_at).toLocaleDateString()}`}
                </span>
                <Button size="sm" variant="secondary" onClick={onUncancel}>
                  Uncancel
                </Button>
              </div>
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
