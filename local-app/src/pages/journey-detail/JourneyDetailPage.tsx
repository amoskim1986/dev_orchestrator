import { useState, useEffect, useCallback } from 'react'
import { useJourneys } from '@dev-orchestrator/shared'
import type { Journey, JourneyUpdate } from '@dev-orchestrator/shared'
import { Button } from '../../components/common/Button'
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

interface JourneyTabData {
  journeyId: string
  projectId: string
}

export function JourneyDetailPage() {
  const [tabs, setTabs] = useState<JourneyTabData[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [activeContentTab, setActiveContentTab] = useState<JourneyTab>('overview')

  // Get the active tab's projectId for the useJourneys hook
  const activeTab = tabs.find(t => t.journeyId === activeTabId)
  const { journeys, updateJourney, loading } = useJourneys(activeTab?.projectId)

  // Get the active journey from the journeys list
  const activeJourney = journeys.find(j => j.id === activeTabId) || null

  // Listen for IPC events from main process
  useEffect(() => {
    if (!window.electronAPI?.journeyDetail) return

    // Initial journey (when window first opens)
    window.electronAPI.journeyDetail.onInit((data) => {
      console.log('Journey detail init:', data)
      setTabs([data])
      setActiveTabId(data.journeyId)
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

  // Render content tabs
  const renderTabContent = () => {
    if (!activeJourney) return null

    switch (activeContentTab) {
      case 'overview':
        return <OverviewTab journey={activeJourney} onUpdate={handleUpdate} />
      case 'intake':
        return <IntakeTab journey={activeJourney} />
      case 'spec':
        return <SpecTab journey={activeJourney} />
      case 'plan':
        return <PlanTab journey={activeJourney} />
      case 'checklists':
        return <ChecklistsTab journey={activeJourney} />
      case 'links':
        return <LinksTab journey={activeJourney} />
      default:
        return null
    }
  }

  // Get journey name for tab display
  const getJourneyName = (journeyId: string) => {
    const journey = journeys.find(j => j.id === journeyId)
    return journey?.name || 'Loading...'
  }

  if (tabs.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400">Waiting for journey data...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Window Title Bar - draggable */}
      <div
        className="h-8 bg-gray-800 flex items-center px-20 shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="text-xs text-gray-400">Journey Details</span>
      </div>

      {/* Journey Tabs Bar */}
      <div className="flex items-center border-b border-gray-700 bg-gray-850 shrink-0 overflow-x-auto">
        {tabs.map(tab => (
          <div
            key={tab.journeyId}
            className={`flex items-center gap-2 px-4 py-2 border-r border-gray-700 cursor-pointer transition-colors ${
              activeTabId === tab.journeyId
                ? 'bg-gray-800 text-white'
                : 'bg-gray-900 text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
            }`}
            onClick={() => setActiveTabId(tab.journeyId)}
          >
            <span className="text-sm truncate max-w-[200px]">
              {getJourneyName(tab.journeyId)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleCloseTab(tab.journeyId)
              }}
              className="text-gray-500 hover:text-white transition-colors p-0.5 rounded hover:bg-gray-700"
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
          <div className="text-gray-400">Loading journey...</div>
        </div>
      ) : !activeJourney ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400">Journey not found</div>
        </div>
      ) : (
        <>
          {/* Journey Header */}
          <div className="flex items-start justify-between p-4 border-b border-gray-700 shrink-0">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-lg font-semibold text-white truncate">{activeJourney.name}</h2>
              <p className="text-sm text-gray-400 mt-1">
                {activeJourney.type.replace('_', ' ')} &bull; {activeJourney.stage.replace(/_/g, ' ')}
              </p>
              {activeJourney.branch_name && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/>
                  </svg>
                  <span className="font-mono">{activeJourney.branch_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Content Tab Navigation */}
          <TabNavigation activeTab={activeContentTab} onTabChange={setActiveContentTab} />

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {renderTabContent()}
          </div>

          {/* Actions Footer */}
          <div className="border-t border-gray-700 p-4 shrink-0">
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.5 0h-11L0 6v12l6.5 6h11L24 18V6L17.5 0zm-7.17 17.89L4.5 12l5.83-5.89 1.34 1.32L7.17 12l4.5 4.57-1.34 1.32zm3.34 0l-1.34-1.32L16.83 12l-4.5-4.57 1.34-1.32L19.5 12l-5.83 5.89z"/>
                </svg>
                Open in VS Code
              </Button>
              <Button variant="danger">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
