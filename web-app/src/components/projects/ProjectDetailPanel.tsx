import { useCallback } from 'react'
import { ProjectIntakeEditor } from './ProjectIntakeEditor'
import { useProjects } from '../../hooks'
import type { Project, ProjectUpdate } from '../../types'

interface ProjectDetailPanelProps {
  project: Project
  onClose: () => void
}

export function ProjectDetailPanel({ project, onClose }: ProjectDetailPanelProps) {
  const { updateProject } = useProjects()

  const handleUpdate = useCallback(async (updates: ProjectUpdate) => {
    await updateProject(project.id, updates)
  }, [project.id, updateProject])

  // Determine intake status
  const intakeStatus = project.ai_parsed_at
    ? 'AI Generated'
    : project.raw_intake
      ? 'Raw Only'
      : 'No Intake'

  return (
    <div className="flex flex-col h-full bg-gray-800 border-l border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-white">{project.name}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{project.root_path}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-1 rounded ${
            intakeStatus === 'AI Generated'
              ? 'bg-green-900/50 text-green-400'
              : intakeStatus === 'Raw Only'
                ? 'bg-yellow-900/50 text-yellow-400'
                : 'bg-gray-700 text-gray-400'
          }`}>
            {intakeStatus}
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
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
        />
      </div>
    </div>
  )
}
