import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  Project,
  ProposedProjectJourney,
  ProposedJourneyStatus,
  Journey,
  JourneyInsert,
  JourneyType,
} from '@dev-orchestrator/shared'
import { useProposedJourneys } from '@dev-orchestrator/shared'
import { Button } from '../common/Button'
import { useProposedJourneysAI } from '../../hooks/useClaudeCli'
import { JourneyIdeaInput } from '../journeys/JourneyIdeaInput'

type FilterTab = 'all' | ProposedJourneyStatus

interface ProposedJourneysTabProps {
  project: Project
  journeys: Journey[]
  onProjectUpdate: (updates: Partial<Project>) => Promise<unknown>
  onCreateJourney: (insert: JourneyInsert) => Promise<Journey>
}

export function ProposedJourneysTab({
  project,
  journeys,
  onProjectUpdate,
  onCreateJourney,
}: ProposedJourneysTabProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [sortReversed, setSortReversed] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const { generate, isGenerating, error: aiError } = useProposedJourneysAI()

  const journeyIds = journeys.map((j) => j.id)

  const {
    proposals,
    addProposal,
    addProposals,
    replaceAllProposals,
    updateProposal,
    deleteProposal,
    toggleReject,
    togglePunt,
    toggleCompleted,
    resetToDraft,
    cleanupOrphanedReferences,
    getProposalsByStatus,
    reorderProposals,
  } = useProposedJourneys({
    project,
    onProjectUpdate,
    journeyIds,
  })

  // Auto-cleanup orphaned references on mount
  useEffect(() => {
    if (proposals.length > 0) {
      cleanupOrphanedReferences()
    }
  }, [journeyIds.join(',')]) // Re-run when journey IDs change

  // Generate proposals from AI
  const handleGenerate = useCallback(async () => {
    if (!project.ai_parsed_intake) return

    // Get existing proposals with descriptions for context
    // Include all proposals so AI knows what already exists
    const existingProposals = proposals.map((p) => ({
      name: p.name,
      description: p.description,
      status: p.status,
    }))

    // Pass the project's root_path so Claude can analyze the codebase
    const result = await generate(project.ai_parsed_intake, project.name, existingProposals, project.root_path)
    if (result?.journeys) {
      if (proposals.length === 0) {
        // First generation - replace all
        await replaceAllProposals(
          result.journeys.map((j) => ({
            name: j.name,
            description: j.description,
            early_plan: j.early_plan,
            status: 'draft' as ProposedJourneyStatus,
            generated_journey_id: null,
            sort_order: 0,
          }))
        )
      } else {
        // Append to existing
        await addProposals(
          result.journeys.map((j) => ({
            name: j.name,
            description: j.description,
            early_plan: j.early_plan,
            status: 'draft' as ProposedJourneyStatus,
            generated_journey_id: null,
            sort_order: 0,
          }))
        )
      }
    }
  }, [project.ai_parsed_intake, project.name, project.root_path, proposals, generate, replaceAllProposals, addProposals])

  // Handle quick idea submission from JourneyIdeaInput
  const handleQuickIdeaSubmit = useCallback(
    async (parsed: { name: string; description: string; early_plan: string; type: JourneyType }) => {
      await addProposal({
        name: parsed.name,
        description: parsed.description,
        early_plan: parsed.early_plan,
        status: 'draft',
        generated_journey_id: null,
        sort_order: proposals.length,
      })
    },
    [addProposal, proposals.length]
  )

  // Convert proposal to journey
  const handleCreateJourney = useCallback(
    async (proposal: ProposedProjectJourney) => {
      const journey = await onCreateJourney({
        project_id: project.id,
        name: proposal.name,
        description: `${proposal.description}\n\n**Early Plan:**\n${proposal.early_plan}`,
        type: 'feature_planning',
      })
      await updateProposal(proposal.id, {
        status: 'generated',
        generated_journey_id: journey.id,
      })
    },
    [project.id, onCreateJourney, updateProposal]
  )

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
      // Reorder the proposals
      const reordered = [...sortedProposals]
      const [removed] = reordered.splice(dragIndex, 1)
      reordered.splice(dragOverIndex, 0, removed)

      // Update sort_order for all affected proposals
      await reorderProposals(reordered.map((p) => p.id))
    }
    setDragIndex(null)
    setDragOverIndex(null)
  }, [dragIndex, dragOverIndex, sortedProposals, reorderProposals])

  const filterTabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: proposals.length },
    { id: 'draft', label: 'Drafts', count: getProposalsByStatus('draft').length },
    { id: 'generated', label: 'Generated', count: getProposalsByStatus('generated').length },
    { id: 'already_completed', label: 'Already Done', count: getProposalsByStatus('already_completed').length },
    { id: 'punted', label: 'Punted', count: getProposalsByStatus('punted').length },
    { id: 'rejected', label: 'Rejected', count: getProposalsByStatus('rejected').length },
    { id: 'cancelled', label: 'Cancelled', count: getProposalsByStatus('cancelled').length },
  ]

  const getLinkedJourney = (proposal: ProposedProjectJourney) =>
    journeys.find((j) => j.id === proposal.generated_journey_id)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Proposed Journeys
          </h3>
          <Button variant="ghost" size="sm" onClick={() => setSortReversed(!sortReversed)}>
            {sortReversed ? 'Oldest First' : 'Newest First'}
          </Button>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !project.ai_parsed_intake}
          size="sm"
        >
          {isGenerating
            ? 'Generating...'
            : proposals.length > 0
              ? 'Generate More'
              : 'Generate Proposals'}
        </Button>
      </div>

      {/* Quick Idea Input */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <JourneyIdeaInput
          projectName={project.name}
          onSubmit={handleQuickIdeaSubmit}
          placeholder="Dictate or type a new journey idea..."
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 px-4 overflow-x-auto">
        {filterTabs.map((tab) => (
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
            <span className="ml-1.5 text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Error display */}
      {aiError && (
        <div className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
          {aiError}
        </div>
      )}

      {/* No intake warning */}
      {!project.ai_parsed_intake && (
        <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
          <p>Generate an AI-refined intake first to create journey proposals.</p>
          <p className="text-sm mt-2">Go to the Description tab and refine your project intake.</p>
        </div>
      )}

      {/* Table */}
      {project.ai_parsed_intake && (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
              <tr>
                <th className="w-8"></th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/3">
                  Title / Description
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/3">
                  Early Plan
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/3">
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
                  onToggleCompleted={() => toggleCompleted(proposal.id)}
                  onResetToDraft={() => resetToDraft(proposal.id)}
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

          {sortedProposals.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              {activeFilter === 'all'
                ? 'No proposals yet. Click "Generate Proposals" to get started.'
                : `No ${activeFilter} proposals.`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Separate row component for inline editing
interface ProposalRowProps {
  proposal: ProposedProjectJourney
  linkedJourney?: Journey
  isEditing: boolean
  index: number
  onStartEdit: () => void
  onEndEdit: () => void
  onUpdateField: (
    id: string,
    updates: Partial<ProposedProjectJourney>
  ) => Promise<ProposedProjectJourney | null>
  onToggleReject: () => void
  onPunt: () => void
  onToggleCompleted: () => void
  onResetToDraft: () => void
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
  onToggleCompleted,
  onResetToDraft,
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

  const rowRef = useRef<HTMLTableRowElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const planRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea to fit content
  const autoResize = (textarea: HTMLTextAreaElement | null) => {
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }

  // Sync local state when proposal changes
  useEffect(() => {
    setLocalName(proposal.name)
    setLocalDescription(proposal.description)
    setLocalPlan(proposal.early_plan)
  }, [proposal.name, proposal.description, proposal.early_plan])

  // Auto-resize textareas when editing starts or content changes
  useEffect(() => {
    if (isEditing) {
      autoResize(descriptionRef.current)
      autoResize(planRef.current)
    }
  }, [isEditing, localDescription, localPlan])

  const [showMenu, setShowMenu] = useState(false)

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
    field: 'name' | 'description' | 'early_plan',
    value: string
  ) => {
    const originalValue =
      field === 'name'
        ? proposal.name
        : field === 'description'
          ? proposal.description
          : proposal.early_plan

    if (value !== originalValue) {
      await onUpdateField(proposal.id, { [field]: value })
    }

    // Only end edit if focus is leaving the row entirely
    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (!relatedTarget || !rowRef.current?.contains(relatedTarget)) {
      onEndEdit()
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
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded ${statusColors[proposal.status]}`}>
              {proposal.status}
            </span>
          </div>
          {isEditing ? (
            <>
              <input
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                onBlur={(e) => handleBlur(e, 'name', localName)}
                className="w-full px-2 py-1 text-sm font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <textarea
                ref={descriptionRef}
                value={localDescription}
                onChange={(e) => {
                  setLocalDescription(e.target.value)
                  autoResize(e.target)
                }}
                onBlur={(e) => handleBlur(e, 'description', localDescription)}
                className="w-full px-2 py-1 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-hidden"
              />
            </>
          ) : (
            <div
              onClick={onStartEdit}
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 -m-1"
            >
              <div className="font-medium text-gray-900 dark:text-white">{proposal.name}</div>
              <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                {proposal.description}
              </div>
            </div>
          )}
        </div>
      </td>

      {/* Column 2: Early Plan */}
      <td className="px-4 py-3 align-top">
        {isEditing ? (
          <textarea
            ref={planRef}
            value={localPlan}
            onChange={(e) => {
              setLocalPlan(e.target.value)
              autoResize(e.target)
            }}
            onBlur={(e) => handleBlur(e, 'early_plan', localPlan)}
            className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-hidden"
          />
        ) : (
          <p
            onClick={onStartEdit}
            className="text-gray-700 dark:text-gray-300 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 -m-1"
          >
            {proposal.early_plan}
          </p>
        )}
      </td>

      {/* Column 3: Actions */}
      <td className="px-4 py-3 align-top">
        <div className="flex items-start gap-2">
          <div className="flex flex-wrap gap-2">
            {proposal.status === 'generated' && linkedJourney ? (
              <button
                onClick={handleOpenJourney}
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm text-left"
              >
                View: {linkedJourney.name}
              </button>
            ) : proposal.status === 'draft' ? (
              <>
                <Button size="sm" onClick={onCreateJourney}>
                  Create
                </Button>
                <Button size="sm" variant="ghost" onClick={onToggleCompleted}>
                  Already Done
                </Button>
                <Button size="sm" variant="ghost" onClick={onPunt}>
                  Punt
                </Button>
                <Button size="sm" variant="ghost" onClick={onToggleReject}>
                  Reject
                </Button>
              </>
            ) : proposal.status === 'already_completed' ? (
              <Button size="sm" variant="secondary" onClick={onToggleCompleted}>
                Undo
              </Button>
            ) : proposal.status === 'punted' ? (
              <Button size="sm" variant="secondary" onClick={onPunt}>
                Unpunt
              </Button>
            ) : proposal.status === 'rejected' ? (
              <Button size="sm" variant="secondary" onClick={onToggleReject}>
                Unreject
              </Button>
            ) : proposal.status === 'cancelled' ? (
              <>
                <Button size="sm" variant="secondary" onClick={onResetToDraft}>
                  Reset to Draft
                </Button>
                <span className="text-xs text-gray-500">
                  Cancelled
                  {proposal.cancelled_at && ` on ${new Date(proposal.cancelled_at).toLocaleDateString()}`}
                </span>
              </>
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
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20">
                  {proposal.status === 'cancelled' && (
                    <button
                      onClick={() => {
                        onResetToDraft()
                        setShowMenu(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Reset to Draft
                    </button>
                  )}
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
