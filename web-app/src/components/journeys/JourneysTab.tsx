import { useState } from 'react'
import { useJourneys } from '../../hooks/useJourneys'
import { useProjects } from '../../hooks/useProjects'
import { JourneyBoard } from './JourneyBoard'
import { AddJourneyModal } from './AddJourneyModal'
import { Button } from '../common/Button'
import type { Journey, JourneyStatus, Project } from '../../types'

// Helper to generate branch name from journey name
function generateBranchName(journeyName: string): string {
  return journeyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}

export function JourneysTab() {
  const { projects, loading: projectsLoading } = useProjects()
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const { journeys, loading, error, createJourney, updateJourney, deleteJourney, startJourney } = useJourneys(selectedProject?.id)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const handleUpdateStatus = async (id: string, status: JourneyStatus) => {
    try {
      await updateJourney(id, { status })
    } catch (err) {
      console.error('Failed to update journey status:', err)
    }
  }

  const handleStart = async (journey: Journey) => {
    if (!selectedProject) return

    // Generate branch name and worktree path
    const branchName = `journey/${generateBranchName(journey.name)}`
    const worktreePath = `${selectedProject.root_path}/.worktrees/${generateBranchName(journey.name)}`

    try {
      await startJourney(journey.id, branchName, worktreePath)
      // Note: The actual git worktree creation happens in the desktop app
    } catch (err) {
      console.error('Failed to start journey:', err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteJourney(id)
    } catch (err) {
      console.error('Failed to delete journey:', err)
    }
    setDeleteConfirm(null)
  }

  // Project selector if no project is selected
  if (!selectedProject) {
    return (
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <h1 className="text-xl font-semibold text-white mb-4">Journeys</h1>

        {projectsLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-400">Loading projects...</div>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-400 mb-2">No projects yet</p>
              <p className="text-sm text-gray-500">Create a project first to manage journeys</p>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <p className="text-gray-400 mb-4">Select a project to view its journeys:</p>
            <div className="grid gap-2 max-w-md">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className="text-left p-3 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
                >
                  <div className="font-medium text-white">{project.name}</div>
                  <div className="text-xs text-gray-500 truncate">{project.root_path}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-400">Loading journeys...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-2">Failed to load journeys</p>
          <p className="text-sm text-gray-500">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedProject(null)}
            className="text-gray-400 hover:text-white transition-colors"
            title="Back to project selection"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-semibold text-white">Journeys</h1>
            <p className="text-sm text-gray-400">{selectedProject.name}</p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          + New Journey
        </Button>
      </div>

      {/* Journey Board */}
      <div className="flex-1 overflow-hidden">
        <JourneyBoard
          journeys={journeys}
          onUpdateStatus={handleUpdateStatus}
          onStart={handleStart}
          onDelete={(id) => setDeleteConfirm(id)}
        />
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-gray-800 rounded-lg p-4 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium text-white mb-2">Delete Journey?</h3>
            <p className="text-sm text-gray-400 mb-4">
              This will delete the journey. Note: The associated worktree (if any) must be removed from the desktop app.
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

      {/* Add Journey Modal */}
      <AddJourneyModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        projectId={selectedProject.id}
        onSubmit={createJourney}
      />
    </div>
  )
}
