import { useState, useEffect, useCallback } from 'react'
import { useProjects } from '@dev-orchestrator/shared'
import type { Project, ProjectUpdate } from '@dev-orchestrator/shared'
import { ProjectIntakeEditor } from '../../components/projects/ProjectIntakeEditor'
import { IntakeChangesDialog } from '../../components/projects/IntakeChangesDialog'

interface ChangesDialogData {
  changesSummary: string
  suggestedUpdates: string
  updatedDocument: string
  onConfirm: () => Promise<void>
  onKeepCurrent: () => Promise<void>
}

export function ProjectDetailPage() {
  const { projects, updateProject, loading } = useProjects()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [changesDialog, setChangesDialog] = useState<ChangesDialogData | null>(null)

  // Get the project from the list
  const project = projects.find(p => p.id === projectId) || null

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

  const handleShowChangesDialog = useCallback((data: ChangesDialogData) => {
    setChangesDialog(data)
  }, [])

  const handleCloseChangesDialog = useCallback(() => {
    setChangesDialog(null)
  }, [])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400">Loading project...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400">
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
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Title Bar - draggable area for window */}
      <div
        className="h-8 bg-gray-800 flex items-center justify-center"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="text-xs text-gray-400">Project Details</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-white">{project.name}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{project.root_path}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${
          intakeStatus === 'AI Generated'
            ? 'bg-green-900/50 text-green-400'
            : intakeStatus === 'Raw Only'
              ? 'bg-yellow-900/50 text-yellow-400'
              : 'bg-gray-700 text-gray-400'
        }`}>
          {intakeStatus}
        </span>
      </div>

      {/* Project Info Summary */}
      <div className="px-4 py-3 border-b border-gray-700 bg-gray-800/50 shrink-0">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Frontend:</span>
            <span className="ml-2 text-gray-200">
              {project.frontend_path || '—'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Backend:</span>
            <span className="ml-2 text-gray-200">
              {project.backend_path || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Intake Editor - takes remaining space */}
      <div className="flex-1 overflow-hidden">
        <ProjectIntakeEditor
          project={project}
          onUpdate={handleUpdate}
          onShowChangesDialog={handleShowChangesDialog}
        />
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
    </div>
  )
}
