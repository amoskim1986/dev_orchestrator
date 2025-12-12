import { useState, useMemo } from 'react'
import { useProjects, useJourneys } from '@dev-orchestrator/shared'
import { JourneyDetailPanel } from './JourneyDetailPanel'
import { JourneyCard } from './JourneyCard'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import type { Project, Journey, JourneyStage, JourneyType, JourneyUpdate } from '@dev-orchestrator/shared'
import { getStagesForType, getInitialStage } from '@dev-orchestrator/shared'

// Journey type configuration
const journeyTypeConfig: Record<JourneyType, { icon: string; label: string; description: string }> = {
  feature_planning: {
    icon: '📋',
    label: 'Feature Planning',
    description: 'Plan features with specs, UI designs, and implementation plans',
  },
  feature: {
    icon: '✨',
    label: 'Feature Implementation',
    description: 'Implement planned features (requires an approved plan)',
  },
  bug: {
    icon: '🐛',
    label: 'Bug Fixes',
    description: 'Track and fix reported bugs',
  },
  investigation: {
    icon: '🔍',
    label: 'Investigations',
    description: 'Research or explore without specific implementation',
  },
}

const journeyTypeOrder: JourneyType[] = ['feature_planning', 'feature', 'bug', 'investigation']

// Get completion status for a journey type
function getCompletionStats(journeys: Journey[], type: JourneyType) {
  const typeJourneys = journeys.filter(j => j.type === type)
  const stages = getStagesForType(type)
  const finalStage = stages[stages.length - 1]
  const completed = typeJourneys.filter(j => j.stage === finalStage).length
  return { completed, total: typeJourneys.length }
}

// Quick intake form component
function QuickIntakeForm({
  journeyType,
  onSubmit,
  isSubmitting,
}: {
  journeyType: JourneyType
  onSubmit: (name: string, description: string) => Promise<void>
  isSubmitting: boolean
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await onSubmit(name.trim(), description.trim())
    setName('')
    setDescription('')
  }

  const placeholders: Record<JourneyType, string> = {
    feature_planning: 'e.g., Add user authentication flow',
    feature: 'e.g., Implement login form from Plan #123',
    bug: 'e.g., Fix checkout button not responding',
    investigation: 'e.g., Research caching strategies',
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800/50 rounded-lg p-4 mb-4">
      <div className="flex gap-3">
        <div className="flex-1 space-y-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={placeholders[journeyType]}
            className="bg-gray-700"
          />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description (optional)"
            className="bg-gray-700 text-sm"
          />
        </div>
        <Button type="submit" disabled={isSubmitting || !name.trim()}>
          {isSubmitting ? 'Creating...' : '+ Add'}
        </Button>
      </div>
    </form>
  )
}

export function JourneysTab() {
  const { projects, loading: projectsLoading } = useProjects()
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const { journeys, loading, error, createJourney, updateJourney, deleteJourney } = useJourneys(selectedProject?.id)
  const [activeType, setActiveType] = useState<JourneyType>('feature_planning')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Filter journeys by active type
  const filteredJourneys = useMemo(() => {
    return journeys.filter(j => j.type === activeType)
  }, [journeys, activeType])

  // Get stats for all types
  const typeStats = useMemo(() => {
    return journeyTypeOrder.reduce((acc, type) => {
      acc[type] = getCompletionStats(journeys, type)
      return acc
    }, {} as Record<JourneyType, { completed: number; total: number }>)
  }, [journeys])

  const handleUpdateStage = async (id: string, stage: JourneyStage) => {
    try {
      await updateJourney(id, { stage })
    } catch (err) {
      console.error('Failed to update journey stage:', err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteJourney(id)
      if (selectedJourney?.id === id) {
        setSelectedJourney(null)
      }
    } catch (err) {
      console.error('Failed to delete journey:', err)
    }
    setDeleteConfirm(null)
  }

  const handleUpdateJourney = async (id: string, updates: JourneyUpdate) => {
    const updated = await updateJourney(id, updates)
    if (selectedJourney?.id === id && updated) {
      setSelectedJourney(updated)
    }
  }

  const handleQuickCreate = async (name: string, description: string) => {
    if (!selectedProject) return
    setIsCreating(true)
    try {
      await createJourney({
        project_id: selectedProject.id,
        name,
        description: description || null,
        type: activeType,
        stage: getInitialStage(activeType),
      })
    } catch (err) {
      console.error('Failed to create journey:', err)
    } finally {
      setIsCreating(false)
    }
  }

  // Keep selected journey in sync
  const currentSelectedJourney = selectedJourney
    ? journeys.find(j => j.id === selectedJourney.id) || null
    : null

  // Project selector
  if (!selectedProject) {
    return (
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <h1 className="text-xl font-semibold text-white mb-4">Journeys</h1>

        {projectsLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-400">Loading projects...</div>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-400 mb-2">No projects yet</p>
              <p className="text-sm text-gray-500">Create a project first to manage journeys</p>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <p className="text-gray-400 mb-4">Select a project to view its journeys:</p>
            <div className="grid gap-2 max-w-md">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className="text-left p-3 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
                >
                  <div className="font-medium text-white">{project.name}</div>
                  <div className="text-xs text-gray-500 truncate">{project.root_path}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-400">Loading journeys...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-2">Failed to load journeys</p>
          <p className="text-sm text-gray-500">{error.message}</p>
        </div>
      </div>
    )
  }

  const activeConfig = journeyTypeConfig[activeType]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with project name */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-700">
        <button
          onClick={() => setSelectedProject(null)}
          className="text-gray-400 hover:text-white transition-colors"
          title="Back to project selection"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-semibold text-white">{selectedProject.name}</h1>
          <p className="text-xs text-gray-500">{selectedProject.root_path}</p>
        </div>
      </div>

      {/* Journey Type Tabs */}
      <div className="flex border-b border-gray-700 overflow-x-auto">
        {journeyTypeOrder.map((type) => {
          const config = journeyTypeConfig[type]
          const stats = typeStats[type]
          const isActive = activeType === type

          return (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-blue-500 text-white bg-gray-800/30'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/20'
              }`}
            >
              <span>{config.icon}</span>
              <span className="text-sm font-medium">{config.label}</span>
              {stats.total > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  isActive ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-700 text-gray-400'
                }`}>
                  {stats.completed}/{stats.total}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content Area */}
      <div className={`flex-1 flex flex-col overflow-hidden p-4 transition-all ${currentSelectedJourney ? 'mr-[480px]' : ''}`}>
        {/* Type Description */}
        <p className="text-sm text-gray-400 mb-4">{activeConfig.description}</p>

        {/* Quick Intake Form */}
        <QuickIntakeForm
          journeyType={activeType}
          onSubmit={handleQuickCreate}
          isSubmitting={isCreating}
        />

        {/* Journey Cards */}
        {filteredJourneys.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <span className="text-4xl mb-3 block">{activeConfig.icon}</span>
              <p className="text-gray-400 mb-1">No {activeConfig.label.toLowerCase()} journeys yet</p>
              <p className="text-sm text-gray-500">Use the form above to create one</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredJourneys.map(journey => (
                <JourneyCard
                  key={journey.id}
                  journey={journey}
                  onUpdateStage={(stage) => handleUpdateStage(journey.id, stage)}
                  onStart={() => {/* No-op in web app */}}
                  onDelete={() => setDeleteConfirm(journey.id)}
                  onClick={() => setSelectedJourney(journey)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-gray-800 rounded-lg p-4 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium text-white mb-2">Delete Journey?</h3>
            <p className="text-sm text-gray-400 mb-4">
              This will delete the journey. Use the desktop app to manage worktrees.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => handleDelete(deleteConfirm)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Journey Detail Panel */}
      {currentSelectedJourney && (
        <JourneyDetailPanel
          journey={currentSelectedJourney}
          onClose={() => setSelectedJourney(null)}
          onUpdate={(updates) => handleUpdateJourney(currentSelectedJourney.id, updates)}
          onDelete={() => {
            setDeleteConfirm(currentSelectedJourney.id)
            setSelectedJourney(null)
          }}
        />
      )}
    </div>
  )
}
