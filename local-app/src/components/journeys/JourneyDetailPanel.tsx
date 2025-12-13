import { useState } from 'react'
import type { Journey, JourneyUpdate } from '../../types'
import { Button } from '../common/Button'
import {
  TabNavigation,
  OverviewTab,
  IntakeTab,
  SpecTab,
  PlanTab,
  ChecklistsTab,
  LinksTab,
  type JourneyTab,
} from './detail-tabs'

interface JourneyDetailPanelProps {
  journey: Journey
  onClose: () => void
  onUpdate: (updates: JourneyUpdate) => Promise<void>
  onOpenClaudeCode?: () => void
  onDelete: () => void
}

export function JourneyDetailPanel({
  journey,
  onClose,
  onUpdate,
  onOpenClaudeCode,
  onDelete,
}: JourneyDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<JourneyTab>('overview')

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab journey={journey} onUpdate={onUpdate} />
      case 'intake':
        return <IntakeTab journey={journey} />
      case 'spec':
        return <SpecTab journey={journey} />
      case 'plan':
        return <PlanTab journey={journey} />
      case 'checklists':
        return <ChecklistsTab journey={journey} />
      case 'links':
        return <LinksTab journey={journey} />
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[520px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-40 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex-1 min-w-0 pr-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{journey.name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
            {journey.type.replace('_', ' ')} • {journey.stage.replace(/_/g, ' ')}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors p-1"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderTabContent()}
      </div>

      {/* Actions Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
        {/* Quick Actions */}
        <div className="flex gap-2">
          {onOpenClaudeCode && (
            <Button onClick={onOpenClaudeCode} className="flex-1">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              Open Claude Code
            </Button>
          )}
          <Button variant="secondary" onClick={() => {/* TODO: Open VS Code */}}>
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.5 0h-11L0 6v12l6.5 6h11L24 18V6L17.5 0zm-7.17 17.89L4.5 12l5.83-5.89 1.34 1.32L7.17 12l4.5 4.57-1.34 1.32zm3.34 0l-1.34-1.32L16.83 12l-4.5-4.57 1.34-1.32L19.5 12l-5.83 5.89z"/>
            </svg>
            VS Code
          </Button>
        </div>

        {/* Delete Button */}
        <Button variant="danger" onClick={onDelete} className="w-full">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Journey
        </Button>
      </div>
    </div>
  )
}
