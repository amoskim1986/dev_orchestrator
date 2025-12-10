import { useEffect } from 'react'
import { useHistoryStore } from '../../stores/historyStore'
import { ProjectTabs } from './ProjectTabs'
import { SessionList } from './SessionList'
import { ConversationViewer } from './ConversationViewer'

export function HistoryTab() {
  const {
    projects,
    sessions,
    messages,
    selectedProjectId,
    selectedSession,
    isLoadingProjects,
    isLoadingSessions,
    isLoadingMessages,
    error,
    loadProjects,
    selectProject,
    selectSession,
    openTerminal,
  } = useHistoryStore()

  // Load projects on mount
  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const handleOpenTerminal = async () => {
    if (selectedSession) {
      // Find the project path for this session
      const project = projects.find((p) => p.id === selectedSession.projectId)
      if (project) {
        await openTerminal(project.path, true, selectedSession.id)
      }
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Error banner */}
      {error && (
        <div className="bg-red-900/50 border-b border-red-700 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Project tabs */}
      <ProjectTabs
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={selectProject}
        isLoading={isLoadingProjects}
      />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Session list */}
        <div className="w-80 border-r border-gray-700 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-700 bg-gray-800/50">
            <h3 className="text-sm font-medium text-gray-300">
              Sessions {sessions.length > 0 && `(${sessions.length})`}
            </h3>
          </div>
          <SessionList
            sessions={sessions}
            selectedSession={selectedSession}
            onSelectSession={selectSession}
            isLoading={isLoadingSessions}
            projects={projects}
          />
        </div>

        {/* Conversation viewer */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {selectedSession ? (
            <>
              <div className="p-3 border-b border-gray-700 bg-gray-800/50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-300">
                    {selectedSession.id.split('-').slice(0, 3).join('-')}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedSession.messageCount} messages • {selectedSession.gitBranch}
                  </p>
                </div>
                <button
                  onClick={handleOpenTerminal}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                >
                  Open Terminal
                </button>
              </div>
              <ConversationViewer
                messages={messages}
                isLoading={isLoadingMessages}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <p>Select a session to view the conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
