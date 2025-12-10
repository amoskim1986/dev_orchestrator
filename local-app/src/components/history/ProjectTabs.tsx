import type { ClaudeProject } from '../../types/history'

interface ProjectTabsProps {
  projects: ClaudeProject[]
  selectedProjectId: string | null
  onSelectProject: (projectId: string | null) => void
  isLoading: boolean
}

export function ProjectTabs({ projects, selectedProjectId, onSelectProject, isLoading }: ProjectTabsProps) {
  if (isLoading) {
    return (
      <div className="border-b border-gray-700 bg-gray-800/50 px-4 py-3">
        <div className="flex gap-2">
          <div className="h-8 w-20 bg-gray-700 rounded animate-pulse" />
          <div className="h-8 w-24 bg-gray-700 rounded animate-pulse" />
          <div className="h-8 w-28 bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="border-b border-gray-700 bg-gray-800/50 px-4 py-2 overflow-x-auto">
      <div className="flex gap-1">
        {/* All Projects tab */}
        <button
          onClick={() => onSelectProject(null)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
            selectedProjectId === null
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          All Projects
        </button>

        {/* Individual project tabs */}
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => onSelectProject(project.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              selectedProjectId === project.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
            title={project.path}
          >
            {project.name}
            <span className="ml-1.5 text-xs text-gray-500">({project.sessionCount})</span>
          </button>
        ))}
      </div>
    </div>
  )
}
