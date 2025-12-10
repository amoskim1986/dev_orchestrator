import { Layout } from './components/layout'
import { Dashboard } from './components/dashboard'
import { ProjectsTab } from './components/projects'
import { JourneysTab } from './components/journeys'

function App() {
  return (
    <Layout>
      {(activeTab) => {
        switch (activeTab) {
          case 'dashboard':
            return <Dashboard />
          case 'projects':
            return <ProjectsTab />
          case 'journeys':
            return <JourneysTab />
          default:
            return <Dashboard />
        }
      }}
    </Layout>
  )
}

export default App
