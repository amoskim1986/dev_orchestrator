import { useState, useEffect, useCallback } from 'react'

interface JourneyOverlayData {
  journeyId: string
  projectId: string
  journeyName: string
  journeyType: string
  journeyStage: string
  branchName?: string
}

export function JourneyOverlayPage() {
  const [journey, setJourney] = useState<JourneyOverlayData | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  useEffect(() => {
    if (!window.electronAPI?.overlay) return

    // Initial data
    window.electronAPI.overlay.onInit((data: JourneyOverlayData) => {
      setJourney(data)
    })

    // Update data
    window.electronAPI.overlay.onUpdate((data: JourneyOverlayData) => {
      setJourney(data)
    })
  }, [])

  const handleOpenJourneyDetail = useCallback(() => {
    if (!journey) return
    window.electronAPI?.overlay?.openJourneyDetail(journey.journeyId, journey.projectId)
  }, [journey])

  const handleClose = useCallback(() => {
    window.electronAPI?.overlay?.close()
  }, [])

  const handleMinimize = useCallback(() => {
    setIsMinimized(true)
  }, [])

  const handleExpand = useCallback(() => {
    setIsMinimized(false)
  }, [])

  if (!journey) {
    return null
  }

  // Minimized view - just a small pill
  if (isMinimized) {
    return (
      <div
        className="h-full flex items-center justify-center cursor-pointer"
        onClick={handleExpand}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={`
          px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-sm border border-gray-200
          shadow-lg transition-all duration-200
          ${isHovered ? 'bg-gray-50/95 border-blue-500' : ''}
        `}>
          <span className="text-xs text-gray-700 truncate max-w-[200px] block">
            {journey.journeyName}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="h-full p-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className={`
        h-full rounded-lg bg-white/95 backdrop-blur-sm border border-gray-200
        shadow-2xl transition-all duration-200 flex flex-col overflow-hidden
        ${isHovered ? 'border-blue-500/50' : ''}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200/50">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Type indicator dot */}
            <div className={`w-2 h-2 rounded-full shrink-0 ${
              journey.journeyType === 'feature' ? 'bg-blue-500' :
              journey.journeyType === 'feature_planning' ? 'bg-purple-500' :
              journey.journeyType === 'bug' ? 'bg-red-500' :
              'bg-yellow-500'
            }`} />
            <span className="text-sm font-medium text-gray-900 truncate">
              {journey.journeyName}
            </span>
          </div>

          {/* Actions */}
          <div
            className="flex items-center gap-1 shrink-0"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              onClick={handleMinimize}
              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Minimize"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button
              onClick={handleClose}
              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Close"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-3 py-2 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="capitalize">{journey.journeyType.replace('_', ' ')}</span>
              <span>•</span>
              <span className="capitalize">{journey.journeyStage.replace(/_/g, ' ')}</span>
            </div>
            {journey.branchName && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/>
                </svg>
                <span className="font-mono truncate">{journey.branchName}</span>
              </div>
            )}
          </div>

          {/* Open Journey Button */}
          <button
            onClick={handleOpenJourneyDetail}
            className="shrink-0 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            title="Open in Dev Orchestrator"
          >
            Open
          </button>
        </div>
      </div>
    </div>
  )
}
