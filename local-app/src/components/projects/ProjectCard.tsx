import { useState } from 'react'
import type { Project } from '../../types'

interface ProjectCardProps {
  project: Project
  onSelect: () => void
  onDelete: () => void
}

function VSCodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.583 2.014L23 7.022v9.956l-5.417 5.008-7.52-5.73L2.002 22l-2-1.998V3.998l2-2L10.063 7.7l7.52-5.686zm-.104 15.268V6.718L12.13 12l5.349 5.282zM2.002 5.932v12.136l5.98-6.068-5.98-6.068z" />
    </svg>
  )
}

export function ProjectCard({ project, onSelect, onDelete }: ProjectCardProps) {
  const [isLaunching, setIsLaunching] = useState(false)

  const handleOpenVSCode = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsLaunching(true)
    try {
      await window.electronAPI.vscode.launch({
        workingDirectory: project.root_path,
        newWindow: true,
      })
    } catch (err) {
      console.error('Failed to open VS Code:', err)
    } finally {
      setIsLaunching(false)
    }
  }
  // Determine intake status
  const intakeStatus = project.ai_parsed_at
    ? 'ai'
    : project.raw_intake
      ? 'raw'
      : 'none'

  return (
    <div
      onClick={onSelect}
      className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">{project.name}</h3>
            {/* Intake status indicator */}
            {intakeStatus === 'ai' && (
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-green-400" title="AI-refined intake" />
            )}
            {intakeStatus === 'raw' && (
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-yellow-400" title="Raw intake only" />
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1" title={project.root_path}>
            {project.root_path}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleOpenVSCode}
            disabled={isLaunching}
            className="text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors p-1 disabled:opacity-50"
            title="Open in VS Code"
          >
            <VSCodeIcon className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"
            title="Delete project"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Path info */}
      <div className="mt-2 flex gap-3 text-xs text-gray-500 dark:text-gray-500">
        {project.frontend_path && (
          <span title={`Frontend: ${project.frontend_path}`}>
            FE: {project.frontend_path.split('/').pop()}
          </span>
        )}
        {project.backend_path && (
          <span title={`Backend: ${project.backend_path}`}>
            BE: {project.backend_path.split('/').pop()}
          </span>
        )}
      </div>
    </div>
  )
}
