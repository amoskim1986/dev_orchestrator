import { useState, useEffect, useCallback } from 'react'
import { useJourneys, useProjects } from '@dev-orchestrator/shared'
import type { JourneyUpdate } from '@dev-orchestrator/shared'
import { useVSCodeLaunch } from '../../hooks/useVSCodeLaunch'
import { Button } from '../../components/common/Button'
import { ToastContainer, ToastData } from '../../components/common/Toast'
import {
  TabNavigation,
  OverviewTab,
  IntakeTab,
  SpecTab,
  PlanTab,
  ChecklistsTab,
  LinksTab,
  type JourneyTab,
} from '../../components/journeys/detail-tabs'
import { SpeechToText } from '../../components/SpeechToText'
import { ErrorBoundary } from '../../components/common/ErrorBoundary'

interface JourneyTabData {
  journeyId: string
  projectId: string
  journeyName?: string  // Cached name so tab doesn't show "Loading..." when switching projects
}

interface JourneyDetailState {
  tabs: JourneyTabData[]
  activeTabId: string | null
  activeContentTab: JourneyTab
}

const JOURNEY_DETAIL_STORAGE_KEY = 'journeyDetailState'

function loadSavedContentTab(): JourneyTab {
  try {
    const saved = localStorage.getItem(JOURNEY_DETAIL_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return parsed.activeContentTab || 'overview'
    }
  } catch {
    // Ignore parse errors
  }
  return 'overview'
}

export function JourneyDetailPage() {
  // Only restore content tab from localStorage - journey tabs come from IPC events
  const [tabs, setTabs] = useState<JourneyTabData[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [activeContentTab, setActiveContentTab] = useState<JourneyTab>(loadSavedContentTab())
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [ipcInitialized, setIpcInitialized] = useState(false)

  // Get the active tab's projectId for the useJourneys hook
  const activeTab = tabs.find(t => t.journeyId === activeTabId)
  const { journeys, updateJourney, deleteJourney, loading } = useJourneys(activeTab?.projectId)
  const { projects } = useProjects()
  const { openVSCode } = useVSCodeLaunch()

  // Get the active journey from the journeys list
  const activeJourney = journeys.find(j => j.id === activeTabId) || null

  // Get the project for the active journey
  const activeProject = projects.find(p => p.id === activeTab?.projectId) || null

  // Persist only content tab to localStorage (journey tabs are managed by main process)
  useEffect(() => {
    localStorage.setItem(JOURNEY_DETAIL_STORAGE_KEY, JSON.stringify({
      activeContentTab,
    }))
  }, [activeContentTab])

  // Toast helpers
  const showToast = useCallback((message: string, type: ToastData['type'] = 'error') => {
    const id = `toast-${Date.now()}`
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Listen for IPC events from main process
  useEffect(() => {
    if (!window.electronAPI?.journeyDetail) return

    // Initial journey (when window first opens)
    window.electronAPI.journeyDetail.onInit((data) => {
      console.log('Journey detail init:', data)
      setTabs([data])
      setActiveTabId(data.journeyId)
      setIpcInitialized(true)
    })

    // Add new tab
    window.electronAPI.journeyDetail.onAddTab((data) => {
      console.log('Journey detail add tab:', data)
      setTabs(prev => {
        // Check if already exists
        if (prev.some(t => t.journeyId === data.journeyId)) {
          return prev
        }
        return [...prev, data]
      })
      setActiveTabId(data.journeyId)
      setIpcInitialized(true)
    })

    // Focus existing tab
    window.electronAPI.journeyDetail.onFocusTab((data) => {
      console.log('Journey detail focus tab:', data)
      setActiveTabId(data.journeyId)
    })
  }, [])

  // Handle closing a tab
  const handleCloseTab = useCallback((journeyId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t.journeyId !== journeyId)

      // If we're closing the active tab, switch to another
      if (activeTabId === journeyId && newTabs.length > 0) {
        setActiveTabId(newTabs[newTabs.length - 1].journeyId)
      } else if (newTabs.length === 0) {
        setActiveTabId(null)
      }

      // Notify main process
      window.electronAPI?.journeyDetail?.closeTab(journeyId)

      return newTabs
    })
  }, [activeTabId])

  // Handle journey update
  const handleUpdate = useCallback(async (updates: JourneyUpdate) => {
    if (!activeJourney) return
    await updateJourney(activeJourney.id, updates)
  }, [activeJourney, updateJourney])

  // Handle stage change (auto-advance when AI generation completes)
  const handleStageChange = useCallback(async (newStage: string) => {
    if (!activeJourney) return
    // Only advance if it's actually a later stage
    await updateJourney(activeJourney.id, { stage: newStage as JourneyUpdate['stage'] })
    showToast(`Stage advanced to: ${newStage.replace(/_/g, ' ')}`, 'success')
  }, [activeJourney, updateJourney, showToast])

  // Handle opening in VS Code (just opens the folder)
  const handleOpenInVSCode = useCallback(async () => {
    if (!activeJourney || !activeProject) {
      showToast('Journey or project not found', 'error')
      return
    }

    try {
      const result = await openVSCode(activeJourney, activeProject)
      if (!result.success) {
        showToast(result.error || 'Failed to open VS Code', 'error')
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to open VS Code', 'error')
    }
  }, [activeJourney, activeProject, openVSCode, showToast])

  // Handle launching Claude Code in VS Code (opens VS Code with Claude Code chat)
  const handleLaunchClaudeCode = useCallback(async () => {
    if (!activeJourney || !activeProject) {
      showToast('Journey or project not found', 'error')
      return
    }

    const workingPath = activeJourney.worktree_path || activeProject.root_path

    try {
      const result = await window.electronAPI.vscode.launch({
        workingDirectory: workingPath,
        newWindow: true,
        maximizeChat: true,
      })
      if (!result.success) {
        showToast(result.error || 'Failed to launch Claude Code', 'error')
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to launch Claude Code', 'error')
    }
  }, [activeJourney, activeProject, showToast])

  // Handle delete journey
  const handleDelete = useCallback(async () => {
    if (!activeJourney) return

    const confirmed = window.confirm(`Are you sure you want to delete "${activeJourney.name}"? This cannot be undone.`)
    if (!confirmed) return

    try {
      await deleteJourney(activeJourney.id)
      showToast('Journey deleted', 'success')
      // Close this tab
      handleCloseTab(activeJourney.id)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete journey', 'error')
    }
  }, [activeJourney, deleteJourney, showToast, handleCloseTab])

  // Render content tabs
  const renderTabContent = () => {
    if (!activeJourney) return null

    switch (activeContentTab) {
      case 'overview':
        return <OverviewTab journey={activeJourney} onUpdate={handleUpdate} onDelete={handleDelete} />
      case 'intake':
        return <IntakeTab journey={activeJourney} onStageChange={handleStageChange} />
      case 'spec':
        return <SpecTab journey={activeJourney} project={activeProject} onStageChange={handleStageChange} />
      case 'plan':
        return <PlanTab journey={activeJourney} project={activeProject} onStageChange={handleStageChange} />
      case 'checklists':
        return <ChecklistsTab journey={activeJourney} />
      case 'links':
        return <LinksTab journey={activeJourney} />
      default:
        return null
    }
  }

  // Update tab names when journeys load (cache names for cross-project tab display)
  useEffect(() => {
    if (journeys.length === 0) return
    setTabs(prev => prev.map(tab => {
      const journey = journeys.find(j => j.id === tab.journeyId)
      if (journey && journey.name !== tab.journeyName) {
        return { ...tab, journeyName: journey.name }
      }
      return tab
    }))
  }, [journeys])

  // Get journey name for tab display - prefer cached name
  const getJourneyName = (tab: JourneyTabData) => {
    // First try to get from current journeys (most up-to-date)
    const journey = journeys.find(j => j.id === tab.journeyId)
    if (journey) return journey.name
    // Fall back to cached name (for tabs from different projects)
    if (tab.journeyName) return tab.journeyName
    return 'Loading...'
  }

  // Show waiting state until IPC sends journey data
  if (!ipcInitialized || tabs.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">
          {ipcInitialized ? 'No journeys open' : 'Waiting for journey data...'}
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Window Title Bar - draggable */}
      <div
        className="h-8 bg-gray-100 dark:bg-gray-800 flex items-center px-20 shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="text-xs text-gray-500 dark:text-gray-400">Journey Details</span>
      </div>

      {/* Journey Tabs Bar */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 shrink-0 overflow-x-auto">
        {tabs.map(tab => (
          <div
            key={tab.journeyId}
            className={`flex items-center gap-2 px-4 py-2 border-r border-gray-200 dark:border-gray-700 cursor-pointer transition-colors ${
              activeTabId === tab.journeyId
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            onClick={() => setActiveTabId(tab.journeyId)}
          >
            <span className="text-sm truncate max-w-[200px]">
              {getJourneyName(tab)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleCloseTab(tab.journeyId)
              }}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Journey Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-400">Loading journey...</div>
        </div>
      ) : !activeJourney ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-400">Journey not found</div>
        </div>
      ) : (
        <>
          {/* Journey Header */}
          <div className="flex items-start justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div className="flex-1 min-w-0 pr-4">
              {/* Breadcrumb: Project > Journey */}
              <div className="flex items-center gap-1.5 text-sm mb-1">
                <button
                  onClick={() => {
                    if (activeProject?.id) {
                      window.electronAPI.projectDetail.open(activeProject.id)
                    }
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
                >
                  {activeProject?.name || 'Project'}
                </button>
                <span className="text-gray-400 dark:text-gray-500">&gt;</span>
                <span className="text-gray-600 dark:text-gray-300 truncate">{activeJourney.name}</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{activeJourney.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {activeJourney.type.replace('_', ' ')} &bull; {activeJourney.stage.replace(/_/g, ' ')}
              </p>
              {activeJourney.branch_name && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/>
                  </svg>
                  <span className="font-mono">{activeJourney.branch_name}</span>
                </div>
              )}
            </div>
            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="secondary" size="sm" onClick={handleOpenInVSCode} title="Open in VS Code">
                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.5 0h-11L0 6v12l6.5 6h11L24 18V6L17.5 0zm-7.17 17.89L4.5 12l5.83-5.89 1.34 1.32L7.17 12l4.5 4.57-1.34 1.32zm3.34 0l-1.34-1.32L16.83 12l-4.5-4.57 1.34-1.32L19.5 12l-5.83 5.89z"/>
                </svg>
                Just VSCode
              </Button>
              <Button variant="primary" size="sm" onClick={handleLaunchClaudeCode} title="New Claude Code chat">
                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.5 0h-11L0 6v12l6.5 6h11L24 18V6L17.5 0zm-7.17 17.89L4.5 12l5.83-5.89 1.34 1.32L7.17 12l4.5 4.57-1.34 1.32zm3.34 0l-1.34-1.32L16.83 12l-4.5-4.57 1.34-1.32L19.5 12l-5.83 5.89z"/>
                </svg>
                Claude Code
              </Button>
            </div>
          </div>

          {/* Content Tab Navigation */}
          <TabNavigation activeTab={activeContentTab} onTabChange={setActiveContentTab} journeyType={activeJourney.type} />

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <ErrorBoundary>
              {renderTabContent()}
            </ErrorBoundary>
          </div>
        </>
      )}

      <SpeechToText />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
