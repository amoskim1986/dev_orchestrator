import { useState, useMemo, useCallback, useEffect } from 'react'
import { useProjects } from '../../hooks/useProjects'
import { useJourneys } from '../../hooks/useJourneys'
import { JourneyCard } from './JourneyCard'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { ToastContainer, ToastData } from '../common/Toast'
import type { Journey, JourneyStage, JourneyType } from '../../types'
import { getStagesForType, getInitialStage } from '@dev-orchestrator/shared'

const STORAGE_KEY_LAST_PROJECT = 'dev-orchestrator:last-project-id'

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

// Helper to generate branch name from journey name
function generateBranchName(journeyName: string): string {
  return journeyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}

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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    // Restore last selected project from localStorage
    return localStorage.getItem(STORAGE_KEY_LAST_PROJECT)
  })

  // Auto-select: prioritize stored project, then fall back to first project
  const selectedProject = useMemo(() => {
    if (selectedProjectId) {
      const found = projects.find(p => p.id === selectedProjectId)
      if (found) return found
    }
    return projects[0] || null
  }, [projects, selectedProjectId])

  // Persist selected project to localStorage
  useEffect(() => {
    if (selectedProject?.id) {
      localStorage.setItem(STORAGE_KEY_LAST_PROJECT, selectedProject.id)
    }
  }, [selectedProject?.id])

  const { journeys, loading, error, createJourney, updateJourney, deleteJourney, startJourney } = useJourneys(selectedProject?.id)
  const [activeType, setActiveType] = useState<JourneyType>('feature_planning')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [toasts, setToasts] = useState<ToastData[]>([])

  // Toast helpers
  const showToast = useCallback((message: string, type: ToastData['type'] = 'error') => {
    const id = `toast-${Date.now()}`
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

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

  const handleStart = async (journey: Journey) => {
    if (!selectedProject) return

    try {
      // First check if this is a git repo
      const isRepo = await window.electronAPI.git.isRepo(selectedProject.root_path)
      if (!isRepo) {
        showToast('Project folder is not a git repository', 'error')
        return
      }

      // Create the git worktree
      const result = await window.electronAPI.git.createWorktree({
        projectPath: selectedProject.root_path,
        journeyName: journey.name,
      })

      if (!result.success) {
        showToast(result.error || 'Failed to create worktree', 'error')
        return
      }

      // Update the journey with the worktree info
      await startJourney(journey.id, result.branchName, result.worktreePath)
      showToast(`Started journey on branch: ${result.branchName}`, 'success')
    } catch (err) {
      console.error('Failed to start journey:', err)
      showToast(err instanceof Error ? err.message : 'Failed to start journey', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      // Find the journey to check if it has a worktree
      const journey = journeys.find(j => j.id === id)

      // If the journey has a worktree, try to remove it first
      if (journey?.worktree_path && selectedProject) {
        try {
          const result = await window.electronAPI.git.removeWorktree({
            projectPath: selectedProject.root_path,
            worktreePath: journey.worktree_path,
          })
          if (!result.success) {
            console.warn('Failed to remove worktree:', result.error)
            // Continue with deletion even if worktree removal fails
          }
        } catch (err) {
          console.warn('Error removing worktree:', err)
          // Continue with deletion even if worktree removal fails
        }
      }

      await deleteJourney(id)
      showToast('Journey deleted', 'success')
    } catch (err) {
      console.error('Failed to delete journey:', err)
      showToast(err instanceof Error ? err.message : 'Failed to delete journey', 'error')
    }
    setDeleteConfirm(null)
  }

  const handleOpenJourneyDetail = useCallback((journey: Journey) => {
    if (!selectedProject) return
    if (window.electronAPI?.journeyDetail?.open) {
      window.electronAPI.journeyDetail.open(journey.id, selectedProject.id)
    }
  }, [selectedProject])

  const handleOpenClaudeCode = async (journey: Journey) => {
    const workingDir = journey.worktree_path || selectedProject?.root_path
    if (!workingDir) {
      console.log('No working directory available')
      return
    }
    try {
      await window.electronAPI.terminal.open({
        cwd: workingDir,
        title: `Claude: ${journey.name}`,
        launchClaude: true,
      })
    } catch (err) {
      console.error('Failed to open Claude Code:', err)
    }
  }

  const handleOpenInVSCode = async (journey: Journey) => {
    if (!selectedProject || !journey.worktree_path) {
      showToast('Journey must be started first to open in VS Code', 'info')
      return
    }
    try {
      const result = await window.electronAPI.vscode.launchForJourney({
        journeyId: journey.id,
        journeyName: journey.name,
        journeyType: journey.type,
        journeyStage: journey.stage,
        worktreePath: journey.worktree_path,
        projectRootPath: selectedProject.root_path,
      })
      if (!result.success) {
        showToast(result.error || 'Failed to open VS Code', 'error')
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to open VS Code', 'error')
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

  // Loading state
  if (projectsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-400">Loading projects...</div>
      </div>
    )
  }

  // No projects state
  if (projects.length === 0) {
    return (
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <h1 className="text-xl font-semibold text-white mb-4">Journeys</h1>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 mb-2">No projects yet</p>
            <p className="text-sm text-gray-500">Create a project first to manage journeys</p>
          </div>
        </div>
      </div>
    )
  }

  const activeConfig = journeyTypeConfig[activeType]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Project Tabs */}
      <div className="flex items-center border-b border-gray-700 bg-gray-900/50">
        <div className="px-4 py-2 text-sm font-medium text-gray-500">Project:</div>
        <div className="flex-1 flex overflow-x-auto">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                selectedProject?.id === project.id
                  ? 'border-blue-500 text-blue-400 bg-gray-800/50'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
              }`}
            >
              {project.name}
            </button>
          ))}
        </div>
      </div>

      {/* Journey Type Tabs */}
      <div className="flex border-b border-gray-700">
        {journeyTypeOrder.map((type) => {
          const config = journeyTypeConfig[type]
          const stats = typeStats[type]
          const isActive = activeType === type

          return (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
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
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        {/* Loading/Error states for journeys */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-400">Loading journeys...</div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-400 mb-2">Failed to load journeys</p>
              <p className="text-sm text-gray-500">{error.message}</p>
            </div>
          </div>
        ) : (
          <>
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
                <div className="flex flex-col gap-2">
                  {filteredJourneys.map(journey => (
                    <JourneyCard
                      key={journey.id}
                      journey={journey}
                      onUpdateStage={(stage) => handleUpdateStage(journey.id, stage)}
                      onStart={() => handleStart(journey)}
                      onDelete={() => setDeleteConfirm(journey.id)}
                      onClick={() => handleOpenJourneyDetail(journey)}
                      onOpenInVSCode={() => handleOpenInVSCode(journey)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-gray-800 rounded-lg p-4 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium text-white mb-2">Delete Journey?</h3>
            <p className="text-sm text-gray-400 mb-4">
              This will delete the journey and its associated worktree (if any).
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

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
