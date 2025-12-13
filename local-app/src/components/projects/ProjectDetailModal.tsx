import { useState, useEffect, useCallback } from 'react'
import { Button } from '../common/Button'
import { ProjectIntakeEditor } from './ProjectIntakeEditor'
import { IntakeChangesDialog } from './IntakeChangesDialog'
import { useProjects } from '@dev-orchestrator/shared'
import type { Project, ProjectUpdate } from '@dev-orchestrator/shared'

interface ProjectDetailModalProps {
  project: Project | null
  isOpen: boolean
  onClose: () => void
}

interface ChangesDialogData {
  changesSummary: string
  suggestedUpdates: string
  updatedDocument: string
  onConfirm: () => Promise<void>
  onKeepCurrent: () => Promise<void>
}

export function ProjectDetailModal({ project, isOpen, onClose }: ProjectDetailModalProps) {
  const { updateProject } = useProjects()
  const [changesDialog, setChangesDialog] = useState<ChangesDialogData | null>(null)

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

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

  if (!isOpen || !project) return null

  const hasIntake = project.raw_intake || project.ai_parsed_intake
  const intakeStatus = project.ai_parsed_at
    ? 'AI Generated'
    : project.raw_intake
      ? 'Raw Only'
      : 'No Intake'

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60"
          onClick={onClose}
        />

        {/* Modal - larger size for detail view */}
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl mx-4 h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{project.name}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{project.root_path}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded ${
                intakeStatus === 'AI Generated'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                  : intakeStatus === 'Raw Only'
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {intakeStatus}
              </span>
              <button
                onClick={onClose}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Project Info Summary */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 shrink-0">
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

          {/* Intake Editor - takes remaining space */}
          <div className="flex-1 overflow-hidden">
            <ProjectIntakeEditor
              project={project}
              onUpdate={handleUpdate}
              onShowChangesDialog={handleShowChangesDialog}
            />
          </div>
        </div>
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
    </>
  )
}
