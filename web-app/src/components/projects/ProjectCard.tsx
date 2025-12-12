import type { Project } from '../../types'

interface ProjectCardProps {
  project: Project
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}

export function ProjectCard({ project, isSelected, onSelect, onDelete }: ProjectCardProps) {
  // Determine intake status
  const intakeStatus = project.ai_parsed_at
    ? 'ai'
    : project.raw_intake
      ? 'raw'
      : 'none'

  return (
    <div
      onClick={onSelect}
      className={`
        p-3 rounded-lg cursor-pointer transition-colors border
        ${isSelected
          ? 'bg-blue-600/20 border-blue-500'
          : 'bg-gray-800 border-gray-700 hover:border-gray-600'
        }
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-white truncate">{project.name}</h3>
            {/* Intake status indicator */}
            {intakeStatus === 'ai' && (
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-green-400" title="AI-refined intake" />
            )}
            {intakeStatus === 'raw' && (
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-yellow-400" title="Raw intake only" />
            )}
          </div>
          <p className="text-xs text-gray-400 truncate mt-1" title={project.root_path}>
            {project.root_path}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="text-gray-500 hover:text-red-400 transition-colors p-1"
          title="Delete project"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Path info */}
      <div className="mt-2 flex gap-3 text-xs text-gray-500">
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
