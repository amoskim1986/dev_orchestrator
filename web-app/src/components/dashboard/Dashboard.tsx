import { useProjects, useJourneys } from '../../hooks'
import { StatusBadge } from '../journeys/StatusBadge'

export function Dashboard() {
  const { projects, loading: projectsLoading } = useProjects()
  const { journeys, loading: journeysLoading } = useJourneys()

  const loading = projectsLoading || journeysLoading

  // Calculate stats
  const journeysByStatus = {
    planning: journeys.filter(j => j.status === 'planning').length,
    in_progress: journeys.filter(j => j.status === 'in_progress').length,
    ready: journeys.filter(j => j.status === 'ready').length,
    deployed: journeys.filter(j => j.status === 'deployed').length,
  }

  const recentJourneys = journeys.slice(0, 5)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="text-3xl font-bold text-white">{projects.length}</div>
          <div className="text-sm text-gray-400">Projects</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="text-3xl font-bold text-white">{journeys.length}</div>
          <div className="text-sm text-gray-400">Total Journeys</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="text-3xl font-bold text-yellow-400">{journeysByStatus.in_progress}</div>
          <div className="text-sm text-gray-400">In Progress</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="text-3xl font-bold text-green-400">{journeysByStatus.ready}</div>
          <div className="text-sm text-gray-400">Ready</div>
        </div>
      </div>

      {/* Journey Status Breakdown */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Journey Status</h2>
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span className="text-gray-300">Planning: {journeysByStatus.planning}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-300">In Progress: {journeysByStatus.in_progress}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-300">Ready: {journeysByStatus.ready}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-300">Deployed: {journeysByStatus.deployed}</span>
          </div>
        </div>
      </div>

      {/* Recent Journeys */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Journeys</h2>
        {recentJourneys.length === 0 ? (
          <p className="text-gray-500">No journeys yet</p>
        ) : (
          <div className="space-y-2">
            {recentJourneys.map((journey) => {
              const project = projects.find(p => p.id === journey.project_id)
              return (
                <div
                  key={journey.id}
                  className="flex items-center justify-between p-2 bg-gray-700/50 rounded"
                >
                  <div>
                    <div className="text-white font-medium">{journey.name}</div>
                    <div className="text-xs text-gray-500">{project?.name || 'Unknown project'}</div>
                  </div>
                  <StatusBadge status={journey.status} size="sm" />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="mt-8 p-4 bg-blue-900/30 border border-blue-800 rounded-lg">
        <h3 className="text-blue-300 font-medium mb-1">Web Interface</h3>
        <p className="text-sm text-blue-200/70">
          This is the web interface for Dev Orchestrator. You can view and manage projects and journeys here.
          For system operations like creating git worktrees, starting servers, or launching Claude Code,
          use the desktop app.
        </p>
      </div>
    </div>
  )
}
