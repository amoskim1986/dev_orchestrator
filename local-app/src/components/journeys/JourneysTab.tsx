import { useState, useMemo, useCallback, useEffect } from 'react'
import { useProjects } from '../../hooks/useProjects'
import { useJourneys } from '../../hooks/useJourneys'
import { useVSCodeLaunch } from '../../hooks/useVSCodeLaunch'
import { JourneyCard } from './JourneyCard'
import { JourneyIdeaInput } from './JourneyIdeaInput'
import { Button } from '../common/Button'
import { ToastContainer, ToastData } from '../common/Toast'
import type { Journey, JourneyStage, JourneyType } from '../../types'
import { getStagesForType, getInitialStage, getSupabase } from '@dev-orchestrator/shared'

const STORAGE_KEY_LAST_PROJECT = 'dev-orchestrator:last-project-id'

// Git status for project
interface ProjectGitStatus {
  isRepo: boolean
  checking: boolean
}

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

// Status filter categories
type StatusFilter = 'active' | 'pending' | 'done'

const statusFilterConfig: Record<StatusFilter, { label: string; color: string }> = {
  active: { label: 'Active', color: 'green' },
  pending: { label: 'Pending', color: 'yellow' },
  done: { label: 'Done', color: 'blue' },
}

const statusFilterOrder: StatusFilter[] = ['active', 'pending', 'done']

// Get journey status category based on its type and stage
function getJourneyStatusCategory(journey: Journey): StatusFilter {
  const stages = getStagesForType(journey.type)
  const firstStage = stages[0]
  const lastStage = stages[stages.length - 1]

  if (journey.stage === firstStage) return 'pending'
  if (journey.stage === lastStage) return 'done'
  return 'active'
}

// Get counts by status category for a journey type
function getStatusCounts(journeys: Journey[], type: JourneyType) {
  const typeJourneys = journeys.filter(j => j.type === type)
  const counts = { pending: 0, active: 0, done: 0, total: typeJourneys.length }

  for (const journey of typeJourneys) {
    const category = getJourneyStatusCategory(journey)
    counts[category]++
  }

  return counts
}

// Group structure for parent-child journeys
interface JourneyGroup {
  parent: Journey | null  // null for standalone journeys
  children: Journey[]
}

// Group journeys by their parent_journey_id
function groupJourneysByParent(journeys: Journey[], allJourneys: Journey[]): JourneyGroup[] {
  const groups: JourneyGroup[] = []
  const childrenByParent = new Map<string, Journey[]>()
  const parentIds = new Set<string>()

  // First pass: collect all parent IDs and group children
  for (const journey of journeys) {
    if (journey.parent_journey_id) {
      const children = childrenByParent.get(journey.parent_journey_id) || []
      children.push(journey)
      childrenByParent.set(journey.parent_journey_id, children)
      parentIds.add(journey.parent_journey_id)
    }
  }

  // Second pass: create groups with parent info (parent + children)
  for (const [parentId, children] of childrenByParent) {
    const parent = allJourneys.find(j => j.id === parentId) || null
    groups.push({ parent, children })
  }

  // Third pass: add standalone journeys (NOT parents) as individual groups
  // A journey is standalone if it has no parent_journey_id AND is not itself a parent
  for (const journey of journeys) {
    if (!journey.parent_journey_id && !parentIds.has(journey.id)) {
      groups.push({ parent: null, children: [journey] })
    }
  }

  return groups
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
  const { launchForJourney } = useVSCodeLaunch()
  const [activeType, setActiveType] = useState<JourneyType>('feature_planning')
  const [activeStatusFilter, setActiveStatusFilter] = useState<StatusFilter>('active')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [gitStatus, setGitStatus] = useState<ProjectGitStatus>({ isRepo: true, checking: true })
  const [isInitializingGit, setIsInitializingGit] = useState(false)
  const [spawnedFromMap, setSpawnedFromMap] = useState<Map<string, string>>(new Map())

  // Fetch spawned_from links for all journeys to find linked planning journeys
  useEffect(() => {
    if (journeys.length === 0) {
      setSpawnedFromMap(new Map())
      return
    }

    const journeyIds = journeys.map(j => j.id)

    getSupabase()
      .from('journey_links')
      .select('from_journey_id, to_journey_id')
      .eq('relationship', 'spawned_from')
      .in('from_journey_id', journeyIds)
      .then(({ data }) => {
        if (data) {
          const map = new Map<string, string>()
          for (const link of data) {
            map.set(link.from_journey_id, link.to_journey_id)
          }
          setSpawnedFromMap(map)
        }
      })
  }, [journeys])

  // Check git status when project changes
  useEffect(() => {
    if (!selectedProject?.root_path) {
      setGitStatus({ isRepo: true, checking: false })
      return
    }

    let cancelled = false
    setGitStatus({ isRepo: true, checking: true })

    window.electronAPI.git.isRepo(selectedProject.root_path).then((isRepo) => {
      if (!cancelled) {
        setGitStatus({ isRepo, checking: false })
      }
    }).catch(() => {
      if (!cancelled) {
        setGitStatus({ isRepo: false, checking: false })
      }
    })

    return () => { cancelled = true }
  }, [selectedProject?.root_path])

  // Toast helpers
  const showToast = useCallback((message: string, type: ToastData['type'] = 'error') => {
    const id = `toast-${Date.now()}`
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Initialize git in project
  const handleInitGit = useCallback(async () => {
    if (!selectedProject?.root_path) return

    setIsInitializingGit(true)
    try {
      const result = await window.electronAPI.git.init(selectedProject.root_path)
      if (result.success) {
        setGitStatus({ isRepo: true, checking: false })
        showToast('Git repository initialized successfully', 'success')
      } else {
        showToast(result.error || 'Failed to initialize git', 'error')
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to initialize git', 'error')
    } finally {
      setIsInitializingGit(false)
    }
  }, [selectedProject?.root_path, showToast])

  // Filter journeys by active type and status filter
  const filteredJourneys = useMemo(() => {
    return journeys.filter(j =>
      j.type === activeType && getJourneyStatusCategory(j) === activeStatusFilter
    )
  }, [journeys, activeType, activeStatusFilter])

  // Group journeys by parent (for feature type, group by parent_journey_id)
  const groupedJourneys = useMemo(() => {
    return groupJourneysByParent(filteredJourneys, journeys)
  }, [filteredJourneys, journeys])

  // Get available groups (journeys that can be parents - those that already have children or have "(Group)" in name)
  const availableGroups = useMemo(() => {
    const parentIds = new Set(journeys.filter(j => j.parent_journey_id).map(j => j.parent_journey_id!))
    return journeys
      .filter(j =>
        j.type === 'feature' &&
        j.project_id === selectedProject?.id &&
        (parentIds.has(j.id) || j.name.includes('(Group)'))
      )
      .map(j => ({ id: j.id, name: j.name }))
  }, [journeys, selectedProject?.id])

  // Handle assigning a journey to a group
  const handleAssignToGroup = useCallback(async (journeyId: string, groupId: string | null) => {
    try {
      await updateJourney(journeyId, { parent_journey_id: groupId })
      showToast(groupId ? 'Moved to group' : 'Removed from group', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update journey', 'error')
    }
  }, [updateJourney, showToast])

  // Toggle group collapse state
  const toggleGroupCollapse = useCallback((groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }, [])

  // Get status counts for current type
  const statusCounts = useMemo(() => {
    return getStatusCounts(journeys, activeType)
  }, [journeys, activeType])

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
    if (!selectedProject) {
      showToast('No project selected', 'error')
      return
    }

    try {
      const result = await launchForJourney(journey, selectedProject)
      if (!result.success) {
        showToast(result.error || 'Failed to open VS Code', 'error')
      } else if (result.isNewSession) {
        showToast('Started new session', 'success')
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to open VS Code', 'error')
    }
  }

  const handleQuickCreate = async (parsed: { name: string; description: string; early_plan: string; type: JourneyType }) => {
    if (!selectedProject) return
    try {
      await createJourney({
        project_id: selectedProject.id,
        name: parsed.name,
        description: `${parsed.description}\n\n**Early Plan:**\n${parsed.early_plan}`,
        type: parsed.type,
        stage: getInitialStage(parsed.type),
      })
    } catch (err) {
      console.error('Failed to create journey:', err)
      throw err // Re-throw so the input card shows the error
    }
  }

  // Loading state
  if (projectsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading projects...</div>
      </div>
    )
  }

  // No projects state
  if (projects.length === 0) {
    return (
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Journeys</h1>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-2">No projects yet</p>
            <p className="text-sm text-gray-500">Create a project first to manage journeys</p>
          </div>
        </div>
      </div>
    )
  }

  const activeConfig = journeyTypeConfig[activeType]

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Project Tabs */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="px-4 py-2 text-sm font-medium text-gray-500">Project:</div>
        <div className="flex-1 flex overflow-x-auto">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                selectedProject?.id === project.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800/50'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/30'
              }`}
            >
              {project.name}
            </button>
          ))}
        </div>
      </div>

      {/* Git Status Warning Banner */}
      {!gitStatus.checking && !gitStatus.isRepo && selectedProject && (
        <div className="flex items-center justify-between px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm">
              This project is not a git repository. Initialize git to enable journey worktrees.
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleInitGit}
            disabled={isInitializingGit}
          >
            {isInitializingGit ? 'Initializing...' : 'Initialize Git'}
          </Button>
        </div>
      )}

      {/* Journey Type Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {journeyTypeOrder.map((type) => {
          const config = journeyTypeConfig[type]
          const typeCounts = getStatusCounts(journeys, type)
          const inProgress = typeCounts.active + typeCounts.pending
          const isActive = activeType === type

          return (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-500 text-gray-900 dark:text-white bg-blue-50 dark:bg-gray-800/30'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/20'
              }`}
            >
              <span>{config.icon}</span>
              <span className="text-sm font-medium">{config.label}</span>
              {typeCounts.total > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  isActive ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {inProgress}/{typeCounts.total}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-700">
        {statusFilterOrder.map((status) => {
          const config = statusFilterConfig[status]
          const count = statusCounts[status]
          const isActive = activeStatusFilter === status
          const isEmpty = count === 0

          const colorClasses = {
            active: {
              selected: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
              default: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700',
              empty: 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-800',
            },
            pending: {
              selected: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
              default: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700',
              empty: 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-800',
            },
            done: {
              selected: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
              default: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700',
              empty: 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-800',
            },
          }

          const buttonClass = isEmpty && !isActive
            ? colorClasses[status].empty
            : colorClasses[status][isActive ? 'selected' : 'default']

          return (
            <button
              key={status}
              onClick={() => setActiveStatusFilter(status)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${buttonClass}`}
            >
              <span>{config.label}</span>
              <span className={`text-xs ${isEmpty ? 'opacity-50' : 'opacity-75'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Loading/Error states for journeys */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-gray-500 dark:text-gray-400">Loading journeys...</div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <p className="text-red-500 dark:text-red-400 mb-2">Failed to load journeys</p>
              <p className="text-sm text-gray-500">{error.message}</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4">
            {/* Type Description - shrink-0 to prevent compression */}
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 shrink-0">{activeConfig.description}</p>

            {/* Quick Idea Input - shrink-0 to prevent compression */}
            <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-4 mb-4 border border-gray-200 dark:border-transparent shrink-0">
              <JourneyIdeaInput
                projectName={selectedProject?.name || 'Project'}
                onSubmit={handleQuickCreate}
                forceType={activeType}
                placeholder={`Describe your ${activeConfig.label.toLowerCase()} idea...`}
              />
            </div>

            {/* Journey Cards - flex-1 to take remaining space, overflow for scroll */}
            {filteredJourneys.length === 0 ? (
              <div className="flex-1 flex items-center justify-center min-h-0">
                <div className="text-center">
                  <span className="text-4xl mb-3 block">{activeConfig.icon}</span>
                  <p className="text-gray-500 dark:text-gray-400 mb-1">
                    No {statusFilterConfig[activeStatusFilter].label.toLowerCase()} {activeConfig.label.toLowerCase()} journeys
                  </p>
                  <p className="text-sm text-gray-500">
                    {activeStatusFilter === 'pending'
                      ? 'Use the form above to create one'
                      : `Switch to another status filter or create a new journey`}
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="flex-1 overflow-y-auto min-h-0"
                style={{ maxHeight: 'calc(100vh - 420px)' }}
              >
                <div className="space-y-3 pb-4">
                  {groupedJourneys.map((group, groupIndex) => {
                    const groupId = group.parent?.id || `standalone-${groupIndex}`
                    const isCollapsed = collapsedGroups.has(groupId)
                    const hasParent = group.parent !== null
                    const isMultiChildGroup = hasParent && group.children.length > 0

                    // For groups with a parent, render with a parent header
                    if (isMultiChildGroup) {
                      const parent = group.parent!
                      const planningJourneyId = spawnedFromMap.get(parent.id)
                      const planningJourney = planningJourneyId ? journeys.find(j => j.id === planningJourneyId) : null
                      const isParentStarted = !!parent.branch_name

                      return (
                        <div key={groupId} className="border border-purple-200 dark:border-purple-800/50 rounded-lg bg-purple-50/30 dark:bg-purple-900/10">
                          {/* Parent Journey Header */}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleGroupCollapse(groupId)}
                            onKeyDown={(e) => e.key === 'Enter' && toggleGroupCollapse(groupId)}
                            className="w-full px-4 py-3 bg-purple-100/50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors cursor-pointer"
                          >
                            {/* Top row: collapse arrow, icon, name, count, view button */}
                            <div className="flex items-center gap-3">
                              {/* Expand/Collapse Arrow */}
                              <svg
                                className={`w-4 h-4 text-purple-600 dark:text-purple-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              {/* Parent Icon */}
                              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                              </svg>
                              <div className="flex-1 text-left">
                                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                  {parent.name}
                                </span>
                                <span className="ml-2 text-xs text-purple-500 dark:text-purple-400">
                                  ({group.children.length} {group.children.length === 1 ? 'journey' : 'journeys'})
                                </span>
                              </div>
                              {/* View Parent Button */}
                              <span
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenJourneyDetail(parent)
                                }}
                                className="text-xs text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-200 underline"
                              >
                                View group
                              </span>
                            </div>

                            {/* Second row: stage, branch, links */}
                            <div className="flex items-center gap-3 mt-2 ml-7 text-xs">
                              {/* Stage badge */}
                              <span className="px-2 py-0.5 rounded bg-purple-200/70 dark:bg-purple-800/50 text-purple-700 dark:text-purple-300">
                                {parent.stage.replace(/_/g, ' ')}
                              </span>

                              {/* Branch name */}
                              {isParentStarted && parent.branch_name && (
                                <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                                    <path fillRule="evenodd" d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/>
                                  </svg>
                                  <span className="font-mono truncate max-w-[150px]">{parent.branch_name}</span>
                                </span>
                              )}

                              {/* Divider */}
                              {(planningJourney || parent.source_url) && (
                                <span className="text-gray-300 dark:text-gray-600">|</span>
                              )}

                              {/* Planning journey link */}
                              {planningJourney && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenJourneyDetail(planningJourney)
                                  }}
                                  className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  <span>📋</span>
                                  <span>View Plan</span>
                                </button>
                              )}

                              {/* Source URL */}
                              {parent.source_url && (
                                <a
                                  href={parent.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                  <span>Source</span>
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Child Journeys */}
                          {!isCollapsed && (
                            <div className="space-y-2 p-2">
                              {group.children.map(journey => (
                                <JourneyCard
                                  key={journey.id}
                                  journey={journey}
                                  parentJourneyName={group.parent?.name}
                                  availableGroups={availableGroups}
                                  onUpdateStage={(stage) => handleUpdateStage(journey.id, stage)}
                                  onStart={() => handleStart(journey)}
                                  onDelete={() => setDeleteConfirm(journey.id)}
                                  onClick={() => handleOpenJourneyDetail(journey)}
                                  onOpenInVSCode={() => handleOpenInVSCode(journey)}
                                  onOpenParent={() => group.parent && handleOpenJourneyDetail(group.parent)}
                                  onAssignToGroup={(groupId) => handleAssignToGroup(journey.id, groupId)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    }

                    // Standalone journeys (no parent) - render directly
                    return group.children.map(journey => (
                      <JourneyCard
                        key={journey.id}
                        journey={journey}
                        availableGroups={availableGroups}
                        onUpdateStage={(stage) => handleUpdateStage(journey.id, stage)}
                        onStart={() => handleStart(journey)}
                        onDelete={() => setDeleteConfirm(journey.id)}
                        onClick={() => handleOpenJourneyDetail(journey)}
                        onOpenInVSCode={() => handleOpenInVSCode(journey)}
                        onAssignToGroup={(groupId) => handleAssignToGroup(journey.id, groupId)}
                      />
                    ))
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg p-4 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Delete Journey?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
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
