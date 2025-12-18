import { useState, useEffect, useCallback } from 'react'

interface JourneyOverlayData {
  journeyId: string
  projectId: string
  projectName: string
  journeyName: string
  journeyType: string
  journeyStage: string
  branchName?: string
}

interface ProjectOverlayData {
  projectId: string
  projectName: string
  rootPath: string
}

type OverlayState =
  | { type: 'journey'; data: JourneyOverlayData }
  | { type: 'project-only'; data: ProjectOverlayData }
  | { type: 'no-journey'; folderName: string }
  | { type: 'loading' }

export function JourneyOverlayPage() {
  const [overlayState, setOverlayState] = useState<OverlayState>({ type: 'loading' })
  const [isHovered, setIsHovered] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  useEffect(() => {
    if (!window.electronAPI?.overlay) return

    // Initial data
    window.electronAPI.overlay.onInit((data: JourneyOverlayData) => {
      setOverlayState({ type: 'journey', data })
    })

    // Update data
    window.electronAPI.overlay.onUpdate((data: JourneyOverlayData) => {
      setOverlayState({ type: 'journey', data })
    })

    // No journey associated with current folder
    window.electronAPI.overlay.onNoJourney(({ folderName }) => {
      setOverlayState({ type: 'no-journey', folderName })
    })

    // Project only (main branch, no active journey)
    window.electronAPI.overlay.onProjectOnly((data: ProjectOverlayData) => {
      setOverlayState({ type: 'project-only', data })
    })
  }, [])

  const handleOpenJourneyDetail = useCallback(() => {
    if (overlayState.type !== 'journey') return
    const journey = overlayState.data
    window.electronAPI?.overlay?.openJourneyDetail(journey.journeyId, journey.projectId)
  }, [overlayState])

  const handleOpenProjectDetail = useCallback(() => {
    if (overlayState.type === 'journey') {
      window.electronAPI?.overlay?.openProjectDetail(overlayState.data.projectId)
    } else if (overlayState.type === 'project-only') {
      window.electronAPI?.overlay?.openProjectDetail(overlayState.data.projectId)
    }
  }, [overlayState])

  const handleClose = useCallback(() => {
    window.electronAPI?.overlay?.close()
  }, [])

  const handleMinimize = useCallback(() => {
    setIsMinimized(true)
  }, [])

  const handleExpand = useCallback(() => {
    setIsMinimized(false)
  }, [])

  // Loading state
  if (overlayState.type === 'loading') {
    return null
  }

  // No journey state
  if (overlayState.type === 'no-journey') {
    // Minimized view for no journey
    if (isMinimized) {
      return (
        <div
          className="h-full flex items-center justify-center cursor-pointer"
          onClick={handleExpand}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className={`
            px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-sm border border-gray-300
            shadow-lg transition-all duration-200
            ${isHovered ? 'bg-gray-50/95' : ''}
          `}>
            <span className="text-xs text-gray-500">No journey</span>
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
          h-full rounded-lg bg-white/95 backdrop-blur-sm border border-gray-300
          shadow-2xl transition-all duration-200 flex flex-col overflow-hidden
        `}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200/50">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-2 h-2 rounded-full shrink-0 bg-gray-400" />
              <span className="text-sm font-medium text-gray-500">
                No associated journey
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
          <div className="flex-1 px-3 py-2 flex items-center">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-gray-400 truncate">
                {overlayState.folderName}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Project-only state (main branch, no active journey)
  if (overlayState.type === 'project-only') {
    const project = overlayState.data

    // Minimized view for project
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
            <span className="text-xs text-gray-700">
              {project.projectName}
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
          {/* Header - Project Name (clickable) */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200/50">
            <button
              onClick={handleOpenProjectDetail}
              className="flex items-center gap-2 min-w-0 flex-1 text-left hover:bg-gray-100 -ml-1 px-1 py-0.5 rounded transition-colors"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              title="Open project"
            >
              <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="text-sm font-medium text-gray-900">
                {project.projectName}
              </span>
            </button>

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

          {/* No journey info */}
          <div className="flex-1 px-3 py-2 flex items-center">
            <div className="flex items-center gap-2 text-gray-500">
              <div className="w-2 h-2 rounded-full shrink-0 bg-gray-400" />
              <span className="text-sm">Main branch (no active journey)</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Journey state
  const journey = overlayState.data

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
          <span className="text-xs text-gray-700">
            {journey.projectName}
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
        {/* Header - Project Name (clickable) */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200/50">
          <button
            onClick={handleOpenProjectDetail}
            className="flex items-center gap-2 min-w-0 flex-1 text-left hover:bg-gray-100 -ml-1 px-1 py-0.5 rounded transition-colors"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            title="Open project"
          >
            <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="text-sm font-medium text-gray-900">
              {journey.projectName}
            </span>
          </button>

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

        {/* Journey Info (clickable) */}
        <button
          onClick={handleOpenJourneyDetail}
          className="flex-1 px-3 py-2 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          title="Open journey"
        >
          {/* Type indicator dot */}
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            journey.journeyType === 'feature' ? 'bg-blue-500' :
            journey.journeyType === 'feature_planning' ? 'bg-purple-500' :
            journey.journeyType === 'bug' ? 'bg-red-500' :
            'bg-yellow-500'
          }`} />

          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-800">
              {journey.journeyName}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
              <span className="capitalize">{journey.journeyType.replace('_', ' ')}</span>
              <span>•</span>
              <span className="capitalize">{journey.journeyStage.replace(/_/g, ' ')}</span>
            </div>
          </div>

          {/* Arrow icon */}
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
