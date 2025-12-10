function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* Draggable title bar */}
      <div className="titlebar h-10 bg-gray-800 flex items-center justify-center shrink-0">
        <span className="text-sm text-gray-400 font-medium">Dev Orchestrator</span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Dev Orchestrator</h1>
          <p className="text-gray-400 mb-2">Multi-universe development environment</p>
          <p className="text-sm text-gray-500">
            Platform: {window.electronAPI?.platform || 'unknown'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
