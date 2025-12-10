import { Layout } from './components/layout/Layout'
import { HistoryTab } from './components/history/HistoryTab'

function App() {
  return (
    <Layout>
      {(activeTab) => {
        switch (activeTab) {
          case 'history':
            return <HistoryTab />
          case 'dashboard':
            return (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold mb-4">Dev Orchestrator</h1>
                  <p className="text-gray-400 mb-2">Multi-universe development environment</p>
                  <p className="text-sm text-gray-500">
                    Platform: {window.electronAPI?.platform || 'unknown'}
                  </p>
                </div>
              </div>
            )
          case 'projects':
            return (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Projects tab coming soon...
              </div>
            )
          case 'journeys':
            return (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Journeys tab coming soon...
              </div>
            )
          default:
            return null
        }
      }}
    </Layout>
  )
}

export default App
