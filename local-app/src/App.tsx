function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Dev Orchestrator</h1>
        <p className="text-gray-400 mb-2">Multi-universe development environment</p>
        <p className="text-sm text-gray-500">
          Platform: {window.electronAPI?.platform || 'unknown'}
        </p>
      </div>
    </div>
  )
}

export default App
