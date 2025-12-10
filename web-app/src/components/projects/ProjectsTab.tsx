import { useState } from 'react'
import { useProjects } from '../../hooks/useProjects'
import { ProjectCard } from './ProjectCard'
import { AddProjectModal } from './AddProjectModal'
import { Button } from '../common/Button'
import type { Project } from '../../types'

interface ProjectsTabProps {
  onSelectProject?: (project: Project) => void
}

export function ProjectsTab({ onSelectProject }: ProjectsTabProps) {
  const { projects, loading, error, createProject, deleteProject } = useProjects()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const handleSelect = (project: Project) => {
    setSelectedId(project.id)
    onSelectProject?.(project)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id)
      if (selectedId === id) {
        setSelectedId(null)
      }
    } catch (err) {
      console.error('Failed to delete project:', err)
    }
    setDeleteConfirm(null)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-400">Loading projects...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-2">Failed to load projects</p>
          <p className="text-sm text-gray-500">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-white">Projects</h1>
        <Button onClick={() => setShowAddModal(true)}>
          + Add Project
        </Button>
      </div>

      {/* Project List */}
      {projects.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 mb-2">No projects yet</p>
            <Button onClick={() => setShowAddModal(true)}>
              Add your first project
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-3 max-w-3xl">
            {projects.map((project) => (
              <div key={project.id}>
                <ProjectCard
                  project={project}
                  isSelected={selectedId === project.id}
                  onSelect={() => handleSelect(project)}
                  onDelete={() => setDeleteConfirm(project.id)}
                />

                {/* Delete confirmation */}
                {deleteConfirm === project.id && (
                  <div className="mt-2 p-3 bg-red-900/30 border border-red-800 rounded-lg">
                    <p className="text-sm text-red-300 mb-2">
                      Delete "{project.name}"? This will also delete all associated journeys.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(project.id)}
                      >
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteConfirm(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      <AddProjectModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={createProject}
      />
    </div>
  )
}
