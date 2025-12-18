import { useState, useEffect, useCallback } from 'react'
import { useProjects, useJourneys } from '@dev-orchestrator/shared'
import type { Project, ProjectUpdate, JourneyInsert, Journey } from '@dev-orchestrator/shared'
import { ProjectIntakeEditor } from '../../components/projects/ProjectIntakeEditor'
import { IntakeChangesDialog } from '../../components/projects/IntakeChangesDialog'
import { ProposedJourneysTab } from '../../components/projects/ProposedJourneysTab'
import { JourneysList } from '../../components/journeys/JourneysList'
import { SpeechToText } from '../../components/SpeechToText'
import { Button } from '../../components/common/Button'
import { ToastContainer, ToastData } from '../../components/common/Toast'

type ProjectTab = 'description' | 'proposed' | 'journeys'

interface ChangesDialogData {
  changesSummary: string
  suggestedUpdates: string
  updatedDocument: string
  onConfirm: () => Promise<void>
  onKeepCurrent: () => Promise<void>
}

const PROJECT_DETAIL_STORAGE_KEY = 'projectDetailState'

export function ProjectDetailPage() {
  const { projects, updateProject, loading } = useProjects()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [projectId, setProjectId] = useState<string | null>(() => {
    // Restore from localStorage on initial mount (handles refresh)
    try {
      const saved = localStorage.getItem(PROJECT_DETAIL_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return parsed.projectId || null
      }
    } catch {
      // Ignore parse errors
    }
    return null
  })
  const [activeTab, setActiveTab] = useState<ProjectTab>(() => {
    try {
      const saved = localStorage.getItem(PROJECT_DETAIL_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return parsed.activeTab || 'description'
      }
    } catch {
      // Ignore parse errors
    }
    return 'description'
  })
  const [changesDialog, setChangesDialog] = useState<ChangesDialogData | null>(null)
  const [toasts, setToasts] = useState<ToastData[]>([])

  // Get journeys for this project (for the proposed journeys tab)
  const { journeys, createJourney, updateJourney, deleteJourney, startJourney, loading: journeysLoading } = useJourneys(projectId || undefined)

  // Get the project from the list
  const project = projects.find(p => p.id === projectId) || null

  // Persist state to localStorage when it changes
  useEffect(() => {
    if (projectId) {
      localStorage.setItem(PROJECT_DETAIL_STORAGE_KEY, JSON.stringify({
        projectId,
        activeTab,
      }))
    }
  }, [projectId, activeTab])

  // Listen for project init from main process
  useEffect(() => {
    const handleInit = (data: { projectId: string }) => {
      console.log('Received project init:', data)
      setProjectId(data.projectId)
    }

    // Check if electronAPI exists and has the projectDetail listener
    if (window.electronAPI?.projectDetail?.onInit) {
      window.electronAPI.projectDetail.onInit(handleInit)
    }

    return () => {
      // Cleanup listener if needed
    }
  }, [])

  const handleUpdate = useCallback(async (updates: ProjectUpdate) => {
    if (!project) return
    await updateProject(project.id, updates)
  }, [project, updateProject])

  const handleCreateJourney = useCallback(async (insert: JourneyInsert): Promise<Journey> => {
    return createJourney(insert)
  }, [createJourney])

  const handleShowChangesDialog = useCallback((data: ChangesDialogData) => {
    setChangesDialog(data)
  }, [])

  const handleCloseChangesDialog = useCallback(() => {
    setChangesDialog(null)
  }, [])

  const handleTitleClick = useCallback(() => {
    if (project) {
      setEditTitle(project.name)
      setIsEditingTitle(true)
    }
  }, [project])

  const handleTitleSave = useCallback(async () => {
    if (!project || !editTitle.trim()) {
      setIsEditingTitle(false)
      return
    }
    if (editTitle.trim() !== project.name) {
      await updateProject(project.id, { name: editTitle.trim() })
    }
    setIsEditingTitle(false)
  }, [project, editTitle, updateProject])

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleTitleSave()
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false)
    }
  }, [handleTitleSave])

  // Toast helpers
  const showToast = useCallback((message: string, type: ToastData['type'] = 'error') => {
    const id = `toast-${Date.now()}`
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Handle opening in VS Code (just opens the folder)
  const handleOpenInVSCode = useCallback(async () => {
    if (!project?.root_path) {
      showToast('No project path available', 'error')
      return
    }

    try {
      const result = await window.electronAPI.vscode.launch({
        workingDirectory: project.root_path,
        newWindow: true,
      })
      if (!result.success) {
        showToast(result.error || 'Failed to open VS Code', 'error')
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to open VS Code', 'error')
    }
  }, [project?.root_path, showToast])

  // Handle launching Claude Code (opens VS Code with Claude Code chat)
  const handleLaunchClaudeCode = useCallback(async () => {
    if (!project?.root_path) {
      showToast('No project path available', 'error')
      return
    }

    try {
      const result = await window.electronAPI.vscode.launch({
        workingDirectory: project.root_path,
        newWindow: true,
        maximizeChat: true,
      })
      if (!result.success) {
        showToast(result.error || 'Failed to launch Claude Code', 'error')
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to launch Claude Code', 'error')
    }
  }, [project, showToast])

  if (loading || journeysLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">Loading project...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">
          {projectId ? 'Project not found' : 'Waiting for project data...'}
        </div>
      </div>
    )
  }

  const intakeStatus = project.ai_parsed_at
    ? 'AI Generated'
    : project.raw_intake
      ? 'Raw Only'
      : 'No Intake'

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Title Bar - draggable area for window */}
      <div
        className="h-8 bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="text-xs text-gray-500 dark:text-gray-400">Project Details</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              autoFocus
              className="w-full text-lg font-semibold text-gray-900 dark:text-white bg-transparent border-b-2 border-blue-500 outline-none"
            />
          ) : (
            <h2
              onClick={handleTitleClick}
              className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Click to edit title"
            >
              {project.name}
            </h2>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{project.root_path}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded ${
            intakeStatus === 'AI Generated'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
              : intakeStatus === 'Raw Only'
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            {intakeStatus}
          </span>
          <Button variant="secondary" size="sm" onClick={handleOpenInVSCode} title="Open in VS Code">
            <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.5 0h-11L0 6v12l6.5 6h11L24 18V6L17.5 0zm-7.17 17.89L4.5 12l5.83-5.89 1.34 1.32L7.17 12l4.5 4.57-1.34 1.32zm3.34 0l-1.34-1.32L16.83 12l-4.5-4.57 1.34-1.32L19.5 12l-5.83 5.89z"/>
            </svg>
            VS Code
          </Button>
          <Button variant="primary" size="sm" onClick={handleLaunchClaudeCode} title="Open Claude Code">
            <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.5 0h-11L0 6v12l6.5 6h11L24 18V6L17.5 0zm-7.17 17.89L4.5 12l5.83-5.89 1.34 1.32L7.17 12l4.5 4.57-1.34 1.32zm3.34 0l-1.34-1.32L16.83 12l-4.5-4.57 1.34-1.32L19.5 12l-5.83 5.89z"/>
            </svg>
            Claude Code
          </Button>
        </div>
      </div>

      {/* Project Info Summary */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 shrink-0">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Frontend:</span>
            <span className="ml-2 text-gray-700 dark:text-gray-200">
              {project.frontend_path || '—'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Backend:</span>
            <span className="ml-2 text-gray-700 dark:text-gray-200">
              {project.backend_path || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent px-4 shrink-0">
        <button
          onClick={() => setActiveTab('description')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'description'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          Description
        </button>
        <button
          onClick={() => setActiveTab('proposed')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'proposed'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          Proposed Journeys
          {(project.proposed_project_journeys?.length ?? 0) > 0 && (
            <span className="ml-1.5 text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
              {project.proposed_project_journeys?.length ?? 0}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('journeys')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'journeys'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          Journeys
          {journeys.length > 0 && (
            <span className="ml-1.5 text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
              {journeys.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content - takes remaining space */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'description' ? (
          <ProjectIntakeEditor
            project={project}
            onUpdate={handleUpdate}
            onShowChangesDialog={handleShowChangesDialog}
          />
        ) : activeTab === 'proposed' ? (
          <ProposedJourneysTab
            project={project}
            journeys={journeys}
            onProjectUpdate={handleUpdate}
            onCreateJourney={handleCreateJourney}
          />
        ) : (
          <JourneysList
            project={project}
            journeys={journeys}
            loading={journeysLoading}
            onCreateJourney={handleCreateJourney}
            onUpdateJourney={updateJourney}
            onDeleteJourney={deleteJourney}
            onStartJourney={startJourney}
            compact
          />
        )}
      </div>

      {/* Changes Dialog */}
      {changesDialog && (
        <IntakeChangesDialog
          isOpen={true}
          onClose={handleCloseChangesDialog}
          changesSummary={changesDialog.changesSummary}
          suggestedUpdates={changesDialog.suggestedUpdates}
          updatedDocument={changesDialog.updatedDocument}
          onConfirm={changesDialog.onConfirm}
          onKeepCurrent={changesDialog.onKeepCurrent}
        />
      )}

      <SpeechToText />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
